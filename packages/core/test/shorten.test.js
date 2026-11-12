import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createClient, createLinkPath, redirectPath, VeylqoProblem } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(readFileSync(join(here, "../openapi/veylqo.json"), "utf8"));
const destination = "https://example.com/docs?token=secret-query";
const publishableKey = "pub-key-not-logged";

test("create and redirect paths are the spec paths", () => {
  assert.equal(spec.paths[createLinkPath].post.operationId, "createLink");
  assert.equal(spec.paths[redirectPath].get.operationId, "redirect");
  assert.equal(Object.hasOwn(spec.paths, createLinkPath), true);
});

test("shorten posts the spec path with the publishable key and caches the code only", async () => {
  const storage = memoryStorage();
  const calls = [];
  const client = createClient({
    baseUrl: "https://s.example/prefix",
    publishableKey,
    storage,
    fetch: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(201, { code: "Ab3xyZ9" });
    },
  });

  const first = await client.shorten({ url: destination });
  const second = await client.shorten({ url: destination, clean: true });

  assert.deepEqual(first, { code: "Ab3xyZ9" });
  assert.deepEqual(second, { code: "Ab3xyZ9" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://s.example/prefix/api/v1/links");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(calls[0].init.credentials, "omit");
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${publishableKey}`);
  assert.deepEqual(JSON.parse(calls[0].init.body), { url: destination });
  assert.equal(storage.items.size, 1);
  const [key, value] = [...storage.items.entries()][0];
  assert.equal(key.startsWith("veylqo:shorten:"), true);
  assert.equal(key.includes(destination), false);
  assert.equal(key.includes("secret-query"), false);
  assert.equal(key.includes(publishableKey), false);
  assert.equal(value.includes(destination), false);
  assert.equal(value.includes(publishableKey), false);
  assert.deepEqual(JSON.parse(value), { code: "Ab3xyZ9" });
  assert.equal(client.publicURL(first.code), "https://s.example/prefix/Ab3xyZ9");
});

test("slug and expiry are not cached", async () => {
  let calls = 0;
  const client = createClient({
    baseUrl: "https://s.example",
    publishableKey,
    storage: memoryStorage(),
    fetch: async () => {
      calls += 1;
      return jsonResponse(201, { code: "custom_slug" });
    },
  });

  await client.shorten({ url: "https://example.com/docs", slug: "custom_slug" });
  await client.shorten({ url: "https://example.com/docs", slug: "custom_slug" });
  await client.shorten({
    url: "https://example.com/docs",
    expires_at: "2026-12-01T00:00:00Z",
  });
  await client.shorten({
    url: "https://example.com/docs",
    expires_at: "2026-12-01T00:00:00Z",
  });
  assert.equal(calls, 4);
});

test("clean false does not reuse the default-clean cache", async () => {
  const bodies = [];
  const client = createClient({
    baseUrl: "https://s.example",
    publishableKey,
    storage: memoryStorage(),
    fetch: async (_url, init) => {
      bodies.push(JSON.parse(init.body));
      return jsonResponse(201, { code: bodies.length === 1 ? "Ab3xyZ9" : "Zy9xyA3" });
    },
  });

  await client.shorten({ url: "https://example.com/docs", clean: false });
  const again = await client.shorten({ url: "https://example.com/docs" });
  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies[0], { url: "https://example.com/docs", clean: false });
  assert.deepEqual(bodies[1], { url: "https://example.com/docs" });
  assert.equal(again.code, "Zy9xyA3");
});

test("a problem response is not cached and does not echo the destination or key", async () => {
  const storage = memoryStorage();
  const logs = [];
  const original = console.log;
  console.log = (...args) => logs.push(args.join(" "));
  try {
    const client = createClient({
      baseUrl: "https://s.example",
      publishableKey,
      storage,
      fetch: async () =>
        jsonResponse(
          401,
          {
            type: "about:blank",
            title: "Unauthorized",
            status: 401,
            detail: "credential required",
            instance: "/api/v1/links",
            slug: "unauthorized",
          },
          "application/problem+json",
        ),
    });
    await assert.rejects(client.shorten({ url: destination }), (err) => {
      assert.ok(err instanceof VeylqoProblem);
      assert.equal(err.status, 401);
      assert.equal(err.slug, "unauthorized");
      assert.equal(err.message, "Unauthorized");
      assert.equal(String(err).includes(destination), false);
      assert.equal(String(err).includes(publishableKey), false);
      assert.equal(String(err).includes("secret-query"), false);
      return true;
    });
  } finally {
    console.log = original;
  }
  assert.equal(storage.items.size, 0);
  assert.deepEqual(logs, []);
});

test("unknown fields are rejected before fetch", async () => {
  let calls = 0;
  const client = createClient({
    baseUrl: "https://s.example",
    publishableKey,
    storage: null,
    fetch: async () => {
      calls += 1;
      return jsonResponse(201, { code: "Ab3xyZ9" });
    },
  });
  await assert.rejects(client.shorten({ url: "https://example.com/docs", extra: "nope" }), /unknown field/);
  assert.equal(calls, 0);
});

test("storage failure does not fail a successful shorten", async () => {
  const client = createClient({
    baseUrl: "https://s.example",
    publishableKey,
    storage: {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("quota");
      },
    },
    fetch: async () => jsonResponse(201, { code: "Ab3xyZ9" }),
  });
  assert.deepEqual(await client.shorten({ url: "https://example.com/docs" }), { code: "Ab3xyZ9" });
});

test("empty publishable key is rejected without echoing it", () => {
  assert.throws(
    () => createClient({ baseUrl: "https://s.example", publishableKey: "   ", fetch: async () => {} }),
    (err) => {
      assert.match(err.message, /publishableKey is required/);
      assert.equal(err.message.includes("   "), false);
      return true;
    },
  );
});

function memoryStorage() {
  const items = new Map();
  return {
    items,
    getItem(key) {
      return items.has(key) ? items.get(key) : null;
    },
    setItem(key, value) {
      items.set(key, String(value));
    },
  };
}

function jsonResponse(status, body, type = "application/json") {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": type },
  });
}
