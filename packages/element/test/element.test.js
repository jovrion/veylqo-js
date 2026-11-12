import assert from "node:assert/strict";
import test from "node:test";

import { EVENT_SHARED, EVENT_SHORTENED, VeylqoShareElement } from "../src/index.js";

test("custom element class exists", () => {
  assert.equal(typeof VeylqoShareElement, "function");
  assert.equal(EVENT_SHORTENED, "veylqo:shortened");
  assert.equal(EVENT_SHARED, "veylqo:shared");
});
