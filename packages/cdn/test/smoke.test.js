import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("@veylqo/cdn scaffold has no runtime dependencies", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(here, "../package.json"), "utf8"));
  assert.equal(pkg.name, "@veylqo/cdn");
  assert.deepEqual(pkg.dependencies ?? {}, {});
});

test("example HTML uses script src and veylqo-share", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const html = readFileSync(join(here, "../examples/index.html"), "utf8");
  assert.match(html, /<script\s+src=/i);
  assert.match(html, /<veylqo-share[\s>]/i);
  assert.match(html, /customElements\.get\("veylqo-share"\)/);
});

test("cdn build artifacts exist after build", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  assert.equal(existsSync(join(here, "../dist/veylqo-cdn.esm.js")), true);
  assert.equal(existsSync(join(here, "../dist/veylqo-cdn.iife.js")), true);
});
