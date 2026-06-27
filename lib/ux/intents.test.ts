import assert from "node:assert/strict";
import test from "node:test";
import { USER_INTENTS, findUserIntent, isValidUserIntentId } from "./intents";

test("USER_INTENTS — URLs stables", () => {
  assert.equal(USER_INTENTS.length, 5);
  assert.match(USER_INTENTS[1]!.href, /^\/compare\?codes=/);
  assert.match(USER_INTENTS[3]!.href, /priorites=fiscalite/);
  assert.equal(USER_INTENTS[4]!.href, "/api/indicators/catalog");
});

test("findUserIntent et isValidUserIntentId", () => {
  assert.equal(findUserIntent("habiter")?.title, "Où habiter ?");
  assert.equal(findUserIntent("unknown"), undefined);
  assert.equal(isValidUserIntentId("dossier"), true);
  assert.equal(isValidUserIntentId("elu"), false);
});
