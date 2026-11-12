import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("@veylqo/core scaffold has no runtime dependencies", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(here, "../package.json"), "utf8"));
  assert.equal(pkg.name, "@veylqo/core");
  assert.deepEqual(pkg.dependencies ?? {}, {});
});
