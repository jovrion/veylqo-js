import assert from "node:assert/strict";
import test from "node:test";

import { share } from "../src/index.js";

const shortURL = "https://s.example/Ab3xyZ9";

test("share uses the Web Share API when it exists", async () => {
  const shared = [];
  const result = await share(
    { url: shortURL, title: "Less URL.", text: "More destination." },
    {
      navigator: {
        share: async (data) => {
          shared.push(data);
        },
      },
    },
  );
  assert.deepEqual(result, { channel: "web-share", url: shortURL });
  assert.deepEqual(shared, [{ title: "Less URL.", text: "More destination.", url: shortURL }]);
});

test("a dismissed share sheet is not a fallback", async () => {
  await assert.rejects(
    share(
      { url: shortURL },
      {
        navigator: {
          share: async () => {
            throw Object.assign(new Error("cancelled"), { name: "AbortError" });
          },
        },
      },
    ),
    (err) => err.name === "AbortError",
  );
});

test("share falls back to copy, WhatsApp, X, and email", async () => {
  const copied = [];
  const result = await share(
    { url: shortURL, title: "Less URL.", text: "More destination." },
    {
      navigator: {
        clipboard: {
          writeText: async (value) => {
            copied.push(value);
          },
        },
      },
    },
  );

  assert.equal(result.channel, "fallback");
  assert.equal(result.url, shortURL);
  const whatsapp = new URL(result.links.whatsapp);
  assert.equal(whatsapp.origin + whatsapp.pathname, "https://wa.me/");
  assert.equal(whatsapp.searchParams.get("text"), `More destination.\n\n${shortURL}`);
  const x = new URL(result.links.x);
  assert.equal(x.origin + x.pathname, "https://x.com/intent/tweet");
  assert.equal(x.searchParams.get("url"), shortURL);
  assert.equal(x.searchParams.get("text"), "More destination.");
  assert.equal(result.links.email.startsWith("mailto:?"), true);
  const mail = new URLSearchParams(result.links.email.slice("mailto:?".length));
  assert.equal(mail.get("subject"), "Less URL.");
  assert.equal(mail.get("body"), `More destination.\n\n${shortURL}`);
  await result.copy();
  assert.deepEqual(copied, [shortURL]);
});

test("copy without a clipboard does not include the URL in the error", async () => {
  const result = await share({ url: shortURL }, { navigator: {} });
  await assert.rejects(result.copy(), (err) => {
    assert.match(err.message, /clipboard unavailable/);
    assert.equal(err.message.includes(shortURL), false);
    assert.equal(err.message.includes("Ab3xyZ9"), false);
    return true;
  });
});

test("share rejects a non-http URL without echoing it", async () => {
  const bad = "javascript:alert(1)";
  await assert.rejects(share({ url: bad }, { navigator: {} }), (err) => {
    assert.match(err.message, /url must be an http\(s\) URL/);
    assert.equal(err.message.includes(bad), false);
    assert.equal(err.message.includes("alert"), false);
    return true;
  });
});
