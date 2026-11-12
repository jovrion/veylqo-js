import { createClient } from "../../core/src/index.js";

const EVENT_SHORTENED = "veylqo:shortened";
const EVENT_SHARED = "veylqo:shared";
const TAG = "veylqo-share";
const BaseHTMLElement = typeof HTMLElement === "function" ? HTMLElement : class {};

class VeylqoShareElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ["url", "endpoint", "key", "title", "text", "label", "disabled"];
  }

  #root;
  #button;
  #status;
  #busy = false;
  #client = null;
  #clientSig = "";

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = `
      <style>
        :host { display: inline-block; }
        button[part~="button"] { cursor: pointer; }
        button[part~="button"][disabled] { cursor: not-allowed; opacity: 0.7; }
        [part~="status"] { display: block; min-height: 1em; margin-top: 0.35rem; font-size: 0.875rem; }
      </style>
      <button type="button" part="button" aria-live="off"></button>
      <span part="status" aria-live="polite" role="status"></span>
    `;
    this.#button = this.#root.querySelector("button");
    this.#status = this.#root.querySelector("span");
    this.#button.addEventListener("click", () => {
      void this.share();
    });
  }

  connectedCallback() {
    this.#render();
  }

  attributeChangedCallback() {
    this.#render();
  }

  get url() {
    return this.getAttribute("url") ?? "";
  }

  set url(value) {
    this.#setAttr("url", value);
  }

  get endpoint() {
    return this.getAttribute("endpoint") ?? "";
  }

  set endpoint(value) {
    this.#setAttr("endpoint", value);
  }

  get key() {
    return this.getAttribute("key") ?? "";
  }

  set key(value) {
    this.#setAttr("key", value);
  }

  get title() {
    return this.getAttribute("title") ?? "";
  }

  set title(value) {
    this.#setAttr("title", value);
  }

  get text() {
    return this.getAttribute("text") ?? "";
  }

  set text(value) {
    this.#setAttr("text", value);
  }

  get label() {
    return this.getAttribute("label") ?? "Share";
  }

  set label(value) {
    this.#setAttr("label", value);
  }

  get disabled() {
    return this.hasAttribute("disabled");
  }

  set disabled(value) {
    if (value) {
      this.setAttribute("disabled", "");
      return;
    }
    this.removeAttribute("disabled");
  }

  async share() {
    if (this.#busy || this.disabled) {
      return;
    }
    this.#busy = true;
    this.#render();
    try {
      const { url, endpoint, key } = this.#required();
      const client = this.#getClient(endpoint, key);
      const created = await client.shorten({ url });
      const publicURL = client.publicURL(created.code);
      this.dispatchEvent(
        new CustomEvent(EVENT_SHORTENED, {
          bubbles: true,
          composed: true,
          detail: { code: created.code, url: publicURL },
        }),
      );

      const shared = await client.share({
        url: publicURL,
        title: this.title || undefined,
        text: this.text || undefined,
      });

      this.dispatchEvent(
        new CustomEvent(EVENT_SHARED, {
          bubbles: true,
          composed: true,
          detail: shared,
        }),
      );
      this.#setStatus("Shared");
    } catch {
      this.#setStatus("Share failed");
      throw new Error("share failed");
    } finally {
      this.#busy = false;
      this.#render();
    }
  }

  #required() {
    const url = this.url.trim();
    const endpoint = this.endpoint.trim();
    const key = this.key.trim();
    if (!url) throw new TypeError("url is required");
    if (!endpoint) throw new TypeError("endpoint is required");
    if (!key) throw new TypeError("key is required");
    return { url, endpoint, key };
  }

  #getClient(endpoint, key) {
    const sig = `${endpoint}\n${key}`;
    if (this.#client && sig === this.#clientSig) {
      return this.#client;
    }
    this.#client = createClient({ baseUrl: endpoint, publishableKey: key });
    this.#clientSig = sig;
    return this.#client;
  }

  #setStatus(message) {
    this.#status.textContent = message;
  }

  #render() {
    this.#button.textContent = this.label;
    this.#button.ariaLabel = this.label;
    this.#button.disabled = this.disabled || this.#busy;
    if (this.#busy) {
      this.#setStatus("Sharing…");
      return;
    }
    if (this.#status.textContent === "Sharing…") {
      this.#setStatus("");
    }
  }

  #setAttr(name, value) {
    if (value === null || value === undefined || value === "") {
      this.removeAttribute(name);
      return;
    }
    this.setAttribute(name, String(value));
  }
}

if (typeof customElements !== "undefined" && !customElements.get(TAG)) {
  customElements.define(TAG, VeylqoShareElement);
}

export { VeylqoShareElement, TAG as veylqoShareTag, EVENT_SHORTENED, EVENT_SHARED };
