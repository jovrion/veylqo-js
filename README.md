# veylqo-js

JavaScript SDK workspace for [Veylqo](https://github.com/jovrion/veylqo).

pnpm workspaces:

| Path | Name |
| --- | --- |
| `packages/core` | `@veylqo/core` — `shorten()` and `share()` |
| `packages/element` | `@veylqo/element` — `<veylqo-share>` custom element |
| `packages/cdn` | `@veylqo/cdn` — CDN bundle scaffold |

## Examples

- HTML: [`examples/html/`](./examples/html/)
- React: [`examples/react/`](./examples/react/)
- Vue: [`examples/vue/`](./examples/vue/)
- Svelte: [`examples/svelte/`](./examples/svelte/)

React < 19 note: use the custom element directly, and bind custom events via
`ref` + `addEventListener` instead of JSX event props.

Tracking stays in the service repo. The HTTP contract copied into
`packages/core/openapi/veylqo.json` comes from `api/openapi/veylqo.json`
in that repo. Regenerate types with `pnpm --filter @veylqo/core generate`.

```bash
pnpm test
pnpm -r build
```

License: MIT.
