import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { detectCsvEncoding } from "./ingest-utils";

function withTempCsv(content: Buffer, run: (path: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "csv-encoding-"));
  const path = join(dir, "sample.csv");
  writeFileSync(path, content);
  try {
    run(path);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("detectCsvEncoding reconnaît UTF-8 avec accents", () => {
  withTempCsv(Buffer.from("nom;libellé\n001;Médico-Psychologique", "utf-8"), (path) => {
    assert.equal(detectCsvEncoding(path), "utf-8");
  });
});

test("detectCsvEncoding reconnaît UTF-8 avec BOM", () => {
  withTempCsv(
    Buffer.from("\uFEFFnom;libellé\n001;Collège", "utf-8"),
    (path) => {
      assert.equal(detectCsvEncoding(path), "utf-8");
    },
  );
});

test("detectCsvEncoding reconnaît Latin-1 (REI)", () => {
  withTempCsv(Buffer.from("nom;libellé\n001;Commune élevée", "latin1"), (path) => {
    assert.equal(detectCsvEncoding(path), "latin1");
  });
});

test("detectCsvEncoding par défaut UTF-8 pour données numériques", () => {
  withTempCsv(Buffer.from("code;value\n35238;12345", "utf-8"), (path) => {
    assert.equal(detectCsvEncoding(path), "utf-8");
  });
});
