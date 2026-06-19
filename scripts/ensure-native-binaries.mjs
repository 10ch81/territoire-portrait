/**
 * Tailwind CSS 4 / lightningcss : binaires natifs Windows.
 *
 * @tailwindcss/postcss embarque un lightningcss imbriqué qui tente aussi un
 * require relatif `../lightningcss.win32-x64-msvc.node`. Turbopack peut échouer
 * si ce fichier est absent, même quand le paquet optionnel est hoisté à la racine.
 */
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

/** @type {Array<{ packageName: string; fileName: string; targetDirs: string[] }>} */
const WINDOWS_NATIVES = [
  {
    packageName: "lightningcss-win32-x64-msvc",
    fileName: "lightningcss.win32-x64-msvc.node",
    targetDirs: [
      join(root, "node_modules/@tailwindcss/postcss/node_modules/lightningcss"),
      join(root, "node_modules/@tailwindcss/node/node_modules/lightningcss"),
    ],
  },
  {
    packageName: "@tailwindcss/oxide-win32-x64-msvc",
    fileName: "tailwindcss-oxide.win32-x64-msvc.node",
    targetDirs: [join(root, "node_modules/@tailwindcss/oxide")],
  },
];

function linkNative({ packageName, fileName, targetDirs }) {
  let source;
  try {
    source = join(dirname(require.resolve(`${packageName}/package.json`)), fileName);
  } catch {
    return;
  }

  if (!existsSync(source)) {
    return;
  }

  for (const targetDir of targetDirs) {
    if (!existsSync(targetDir)) {
      continue;
    }

    const target = join(targetDir, fileName);
    if (existsSync(target)) {
      continue;
    }

    copyFileSync(source, target);
    console.log(`[postinstall] ${fileName} -> ${targetDir}`);
  }
}

if (process.platform === "win32") {
  for (const native of WINDOWS_NATIVES) {
    linkNative(native);
  }
}
