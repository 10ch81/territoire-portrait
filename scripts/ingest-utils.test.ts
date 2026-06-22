import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  assertFileUnderMaxBytes,
  detectCsvEncoding,
  parseCsvLine,
} from "./ingest-utils";

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

test("detectCsvEncoding reste UTF-8 malgré un octet invalide isolé (FINESS)", () => {
  const content = Buffer.concat([
    Buffer.from("nom;libcategetab\n001;Maison de santé", "utf-8"),
    Buffer.from([0xff]),
    Buffer.from(";002;Centre médical", "utf-8"),
  ]);
  withTempCsv(content, (path) => {
    assert.equal(detectCsvEncoding(path), "utf-8");
  });
});

test("parseCsvLine conserve les séparateurs entre guillemets", () => {
  assert.deepEqual(
    parseCsvLine('"code";"libellé";"note; avec ; séparateurs";"guillemet ""échappé"""'),
    ["code", "libellé", "note; avec ; séparateurs", 'guillemet "échappé"'],
  );
});

test("assertFileUnderMaxBytes accepte un fichier sous le seuil", () => {
  withTempCsv(Buffer.from("a;b\n1;2", "utf-8"), (path) => {
    assert.doesNotThrow(() => assertFileUnderMaxBytes(path, 1024));
  });
});

test("assertFileUnderMaxBytes rejette un fichier au-dessus du seuil", () => {
  withTempCsv(Buffer.alloc(2048, "x"), (path) => {
    assert.throws(
      () => assertFileUnderMaxBytes(path, 1024),
      /Fichier trop lourd/,
    );
  });
});
