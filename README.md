# veylqo-js

JavaScript SDK workspace for [Veylqo](https://github.com/jovrion/veylqo).

pnpm workspaces:

| Path | Name |
| --- | --- |
| `packages/core` | `@veylqo/core` — `shorten()` and `share()` |
| `packages/element` | `@veylqo/element` — `<veylqo-share>` custom element |
| `packages/cdn` | `@veylqo/cdn` — CDN bundle |

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
pnpm lint
pnpm test
pnpm build
```

`pnpm lint` checks JavaScript syntax, rejects UI runtime dependencies in
`core` and `element`, and regenerates OpenAPI types so a stale
`openapi.d.ts` fails the check. CI runs those three commands from
`.github/workflows/ci.yml`.

`main` is protected by `.github/rulesets/protect-main.json`. Push a
branch and open a pull request. The required check is `test`. Squash or
rebase; do not merge-commit.

License: MIT.
