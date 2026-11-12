// Paths copied from the service spec (api/openapi/veylqo.json).
// Do not add a route that is not a key of packages/core/openapi/veylqo.json.

/** @type {keyof import("./openapi.d.ts").paths} */
export const createLinkPath = "/api/v1/links";

/** @type {keyof import("./openapi.d.ts").paths} */
export const redirectPath = "/{code}";
