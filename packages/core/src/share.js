/**
 * @typedef {object} ShareInput
 * @property {string} url
 * @property {string} [title]
 * @property {string} [text]
 */

/**
 * @typedef {object} ShareNavigator
 * @property {(data: { title?: string, text?: string, url?: string }) => Promise<void>} [share]
 * @property {{ writeText?: (value: string) => Promise<void> }} [clipboard]
 */

/**
 * @typedef {object} ShareWeb
 * @property {"web-share"} channel
 * @property {string} url
 */

/**
 * @typedef {object} ShareFallback
 * @property {"fallback"} channel
 * @property {string} url
 * @property {{ whatsapp: string, x: string, email: string }} links
 * @property {() => Promise<void>} copy
 */

/**
 * Share a URL. Uses the Web Share API when present. Otherwise returns
 * copy / WhatsApp / X / email fallbacks and does not open them.
 * A missing API is the only fallback trigger. A rejection (including
 * the user dismissing the sheet) is not turned into a fallback.
 * The URL is not written to a log.
 *
 * @param {ShareInput} input
 * @param {{ navigator?: ShareNavigator }} [env]
 * @returns {Promise<ShareWeb | ShareFallback>}
 */
export async function share(input, env = globalThis) {
  const url = httpURL(input?.url, "url");
  const title = optionalText(input?.title, "title");
  const text = optionalText(input?.text, "text");
  const navigatorRef = env?.navigator;

  if (typeof navigatorRef?.share === "function") {
    await navigatorRef.share({ title, text, url });
    return { channel: "web-share", url };
  }

  return {
    channel: "fallback",
    url,
    links: fallbackLinks({ title, text, url }),
    copy: () => copyURL(url, navigatorRef),
  };
}

/**
 * @param {string | undefined} value
 * @param {string} label
 */
function httpURL(value, label) {
  if (typeof value !== "string" || value === "") {
    throw new TypeError(`${label} must be an http(s) URL`);
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError(`${label} must be an http(s) URL`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError(`${label} must be an http(s) URL`);
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new TypeError(`${label} must not include credentials`);
  }
  return parsed.toString();
}

/**
 * @param {string | undefined} value
 * @param {string} label
 */
function optionalText(value, label) {
  if (value === undefined) {
    return "";
  }
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be a string`);
  }
  return value;
}

/**
 * @param {{ title: string, text: string, url: string }} input
 */
function fallbackLinks(input) {
  const message = [input.text, input.url].filter(Boolean).join("\n\n");
  const whatsapp = new URL("https://wa.me/");
  whatsapp.searchParams.set("text", message);

  const x = new URL("https://x.com/intent/tweet");
  x.searchParams.set("url", input.url);
  if (input.text) {
    x.searchParams.set("text", input.text);
  }

  const mail = new URLSearchParams();
  if (input.title) {
    mail.set("subject", input.title);
  }
  if (message) {
    mail.set("body", message);
  }
  const query = mail.toString();
  return {
    whatsapp: whatsapp.toString(),
    x: x.toString(),
    email: query ? `mailto:?${query}` : "mailto:",
  };
}

/**
 * @param {string} url
 * @param {ShareNavigator | undefined} navigatorRef
 */
async function copyURL(url, navigatorRef) {
  const writeText = navigatorRef?.clipboard?.writeText;
  if (typeof writeText !== "function") {
    throw new TypeError("clipboard unavailable");
  }
  await writeText.call(navigatorRef.clipboard, url);
}
