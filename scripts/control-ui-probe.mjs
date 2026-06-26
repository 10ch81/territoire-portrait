import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.CONTROL_UI_BASE ?? "http://127.0.0.1:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "control-ui-artifacts");

/** @type {Array<{ name: string; path: string; expectedStatus?: number; expect: (page: import('playwright').Page) => Promise<{ ok: boolean; detail: string }> }>} */
const PAGES = [
  {
    name: "home",
    path: "/",
    expect: async (page) => {
      const h1 = page.getByRole("heading", { level: 1, name: /Où habiter/i });
      const visible = await h1.isVisible();
      return {
        ok: visible,
        detail: visible ? "H1 accueil visible" : "H1 accueil absent",
      };
    },
  },
  {
    name: "compare-empty",
    path: "/compare",
    expect: async (page) => {
      const heading = page.getByRole("heading", { name: /compar/i }).first();
      const visible = await heading.isVisible();
      return {
        ok: visible,
        detail: visible ? "En-tête comparateur visible" : "En-tête comparateur absent",
      };
    },
  },
  {
    name: "compare-filled",
    path: "/compare?codes=35238,44109,49007",
    expect: async (page) => {
      await page.locator("#compare-main").waitFor({ state: "visible", timeout: 30_000 });
      const hasRennes =
        (await page.locator("#compare-main").getByRole("link", { name: /Rennes/i }).count()) > 0;
      const tableVisible = await page.locator("#compare-main table").first().isVisible();
      return {
        ok: tableVisible && hasRennes,
        detail: `table=${tableVisible}, Rennes=${hasRennes}`,
      };
    },
  },
  {
    name: "commune-particulier",
    path: "/commune/35238",
    expect: async (page) => {
      const h1 = page.getByRole("heading", { level: 1, name: /Rennes/i });
      const visible = await h1.isVisible();
      return {
        ok: visible,
        detail: visible ? "Fiche Rennes (particulier) visible" : "Fiche Rennes absente",
      };
    },
  },
  {
    name: "commune-detail",
    path: "/commune/35238?vue=detail",
    expect: async (page) => {
      const h1 = page.getByRole("heading", { level: 1, name: /Rennes/i });
      const sources = page.locator("#sources");
      const h1Ok = await h1.isVisible();
      const sourcesOk = await sources.isVisible().catch(() => false);
      return {
        ok: h1Ok && sourcesOk,
        detail: `h1=${h1Ok}, sources=${sourcesOk}`,
      };
    },
  },
  {
    name: "commune-not-found",
    path: "/commune/99999",
    expectedStatus: 404,
    expect: async (page) => {
      const heading = page.getByRole("heading", { name: /Commune introuvable/i });
      await heading.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
      const visible = await heading.isVisible();
      return {
        ok: visible,
        detail: visible ? "Page 404 métier affichée" : "Page introuvable absente",
      };
    },
  },
  {
    name: "commune-invalid-insee",
    path: "/commune/abc",
    expectedStatus: 404,
    expect: async (page) => {
      const heading = page.getByRole("heading", { name: /Commune introuvable/i });
      const visible = await heading.isVisible().catch(() => false);
      return {
        ok: visible,
        detail: visible ? "Code INSEE invalide → 404 métier" : "Page introuvable absente",
      };
    },
  },
];

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (text.includes("webpack-hmr") || text.includes("_next/webpack-hmr")) return;
    consoleErrors.push(text);
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  /** @type {Array<Record<string, unknown>>} */
  const results = [];

  for (const route of PAGES) {
    const url = `${BASE}${route.path}`;
    consoleErrors.length = 0;
    pageErrors.length = 0;

    let httpStatus = 0;
    let loadError = null;

    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
      httpStatus = response?.status() ?? 0;
      await page.waitForTimeout(500);
      const check = await route.expect(page);
      const statusOk =
        route.expectedStatus == null
          ? httpStatus < 500
          : httpStatus === route.expectedStatus;
      const screenshot = path.join(OUT, `${route.name}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });

      results.push({
        name: route.name,
        url,
        httpStatus,
        expectedStatus: route.expectedStatus ?? null,
        ok: check.ok && statusOk,
        detail: statusOk ? check.detail : `${check.detail} (HTTP ${httpStatus}, attendu ${route.expectedStatus})`,
        consoleErrors: [...consoleErrors],
        pageErrors: [...pageErrors],
        screenshot: path.relative(process.cwd(), screenshot),
      });
    } catch (err) {
      loadError = String(err);
      const screenshot = path.join(OUT, `${route.name}-error.png`);
      await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
      results.push({
        name: route.name,
        url,
        httpStatus,
        expectedStatus: route.expectedStatus ?? null,
        ok: false,
        detail: loadError,
        consoleErrors: [...consoleErrors],
        pageErrors: [...pageErrors],
        screenshot: path.relative(process.cwd(), screenshot),
      });
    }
  }

  await browser.close();

  const summary = {
    base: BASE,
    testedAt: new Date().toISOString(),
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };

  const reportPath = path.join(OUT, "report.json");
  await writeFile(reportPath, JSON.stringify(summary, null, 2), "utf8");

  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
