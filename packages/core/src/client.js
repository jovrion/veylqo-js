import { createLinkPath, redirectPath } from "./paths.js";
import { share } from "./share.js";

/**
 * @typedef {Omit<import("./openapi.d.ts").components["schemas"]["CreateLinkRequest"], "clean"> & { clean?: boolean }} ShortenRequest
 * @typedef {import("./openapi.d.ts").operations["createLink"]["responses"][201]["content"]["application/json"]} CreateLinkResponse
 * @typedef {import("./openapi.d.ts").components["schemas"]["Problem"]} Problem
 */

const KNOWN_FIELDS = new Set(["url", "slug", "clean", "expires_at"]);
const CODE_PATTERN = /^[A-Za-z0-9_-]{3,64}$/;
const CACHE_PREFIX = "veylqo:shorten:";

/**
 * RFC 9457 problem. The message is the title only. The destination URL,
 * the publishable key, and the request query are not added.
 */
export class VeylqoProblem extends Error {
  /**
   * @param {Problem & { status: number }} problem
   */
  constructor(problem) {
    super(typeof problem.title === "string" && problem.title !== "" ? problem.title : "request failed");
    this.name = "VeylqoProblem";
    this.status = problem.status;
    this.type = problem.type;
    this.title = problem.title;
    this.detail = problem.detail;
    this.instance = problem.instance;
    this.slug = problem.slug;
  }
}

/**
 * @typedef {object} ClientOptions
 * @property {string} baseUrl
 * @property {string} publishableKey
 * @property {typeof fetch} [fetch]
 * @property {Pick<Storage, "getItem" | "setItem"> | null} [storage]
 */

/**
 * @param {ClientOptions} options
 */
export function createClient(options) {
  if (options == null || typeof options !== "object") {
    throw new TypeError("client options are required");
  }
  const baseUrl = httpURL(options.baseUrl, "baseUrl");
  const publishableKey = requiredSecret(options.publishableKey);
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new TypeError("fetch is required");
  }
  const storage = options.storage === undefined ? globalThis.sessionStorage : options.storage;

  return {
    /**
     * @param {ShortenRequest} request
     * @returns {Promise<CreateLinkResponse>}
     */
    async shorten(request) {
      const body = requestBody(request);
      const key = cacheKey(baseUrl, body);
      const cached = readCache(storage, key);
      if (cached) {
        return cached;
      }
      const response = await fetchImpl(joinURL(baseUrl, createLinkPath), {
        method: "POST",
        redirect: "error",
        credentials: "omit",
        headers: {
          Authorization: `Bearer ${publishableKey}`,
          "Content-Type": "application/json",
          Accept: "application/json, application/problem+json",
        },
        body: JSON.stringify(body),
      });
      if (response.status !== 201) {
        throw await problemFrom(response);
      }
      const created = await readCreated(response);
      writeCache(storage, key, created);
      return created;
    },

    /**
     * Public resolve path from the spec: `/{code}`.
     * @param {string} code
     */
    publicURL(code) {
      if (typeof code !== "string" || !CODE_PATTERN.test(code)) {
        throw new TypeError("code is not a public code");
      }
      return joinURL(baseUrl, redirectPath.replace("{code}", code));
    },

    share,
  };
}

/**
 * @param {unknown} value
 */
function requiredSecret(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("publishableKey is required");
  }
  return value.trim();
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
 * @param {string} base
 * @param {string} path
 */
function joinURL(base, path) {
  const root = base.endsWith("/") ? base : `${base}/`;
  return new URL(path.replace(/^\//, ""), root).toString();
}

/**
 * @param {ShortenRequest} input
 */
function requestBody(input) {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("shorten request must be an object");
  }
  for (const field of Object.keys(input)) {
    if (!KNOWN_FIELDS.has(field)) {
      throw new TypeError("unknown field");
    }
  }
  const url = httpURL(input.url, "url");
  /** @type {Record<string, string | boolean>} */
  const body = { url };
  if (input.slug !== undefined) {
    if (typeof input.slug !== "string" || !CODE_PATTERN.test(input.slug)) {
      throw new TypeError("slug is not a public code");
    }
    body.slug = input.slug;
  }
  if (input.clean !== undefined) {
    if (typeof input.clean !== "boolean") {
      throw new TypeError("clean must be a boolean");
    }
    body.clean = input.clean;
  }
  if (input.expires_at !== undefined) {
    if (typeof input.expires_at !== "string" || Number.isNaN(Date.parse(input.expires_at))) {
      throw new TypeError("expires_at must be a date-time");
    }
    body.expires_at = input.expires_at;
  }
  return body;
}

/**
 * Idempotent reuse is only the no-slug, no-expiry case. The key is a
 * hash so the destination is not the storage key. The value is the
 * public code only.
 *
 * @param {string} baseUrl
 * @param {Record<string, string | boolean>} body
 */
function cacheKey(baseUrl, body) {
  if (body.slug !== undefined || body.expires_at !== undefined) {
    return null;
  }
  const clean = body.clean !== false;
  return CACHE_PREFIX + fnv1a(`${baseUrl}\n${body.url}\n${clean}`);
}

/**
 * @param {Pick<Storage, "getItem" | "setItem"> | null | undefined} storage
 * @param {string | null} key
 * @returns {CreateLinkResponse | null}
 */
function readCache(storage, key) {
  if (!storage || !key) {
    return null;
  }
  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.code !== "string" || !CODE_PATTERN.test(parsed.code)) {
      return null;
    }
    return { code: parsed.code };
  } catch {
    return null;
  }
}

/**
 * @param {Pick<Storage, "getItem" | "setItem"> | null | undefined} storage
 * @param {string | null} key
 * @param {CreateLinkResponse} created
 */
function writeCache(storage, key, created) {
  if (!storage || !key) {
    return;
  }
  try {
    storage.setItem(key, JSON.stringify({ code: created.code }));
  } catch {
    // Quota or private mode. The shorten still succeeded.
  }
}

/**
 * @param {Response} response
 */
async function readCreated(response) {
  let parsed;
  try {
    parsed = await response.json();
  } catch {
    throw new TypeError("response code is not a public code");
  }
  if (!parsed || typeof parsed.code !== "string" || !CODE_PATTERN.test(parsed.code)) {
    throw new TypeError("response code is not a public code");
  }
  return { code: parsed.code };
}

/**
 * @param {Response} response
 */
async function problemFrom(response) {
  /** @type {Partial<Problem>} */
  let body = {};
  try {
    const text = await response.text();
    if (text) {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        body = parsed;
      }
    }
  } catch {
    body = {};
  }
  return new VeylqoProblem({
    status: typeof body.status === "number" ? body.status : response.status,
    type: typeof body.type === "string" ? body.type : "about:blank",
    title: typeof body.title === "string" ? body.title : "",
    detail: typeof body.detail === "string" ? body.detail : undefined,
    instance: typeof body.instance === "string" ? body.instance : undefined,
    slug: typeof body.slug === "string" ? body.slug : undefined,
  });
}

/**
 * @param {string} value
 */
function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}
