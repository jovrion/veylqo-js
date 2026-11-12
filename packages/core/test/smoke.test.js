import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const UI_RUNTIME = ["react", "react-dom", "vue", "lit", "@lit/reactive-element", "svelte", "preact", "solid-js"];

test("@veylqo/core has no UI runtime dependencies", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(here, "../package.json"), "utf8"));
  assert.equal(pkg.name, "@veylqo/core");
  assert.deepEqual(pkg.dependencies ?? {}, {});
  const runtime = Object.keys(pkg.dependencies ?? {});
  for (const name of UI_RUNTIME) {
    assert.equal(runtime.includes(name), false, name);
  }
  assert.equal(Object.hasOwn(pkg.devDependencies, "openapi-typescript"), true);
  assert.equal(Object.hasOwn(pkg.dependencies ?? {}, "openapi-typescript"), false);
});
