# veylqo-js

JavaScript SDK workspace for [Veylqo](https://github.com/jovrion/veylqo).

pnpm workspaces:

| Path | Name |
| --- | --- |
| `packages/core` | `@veylqo/core` — `shorten()` and `share()` |
| `packages/element` | `@veylqo/element` — empty scaffold |
| `packages/cdn` | `@veylqo/cdn` — empty scaffold |

`<veylqo-share>` is not implemented yet.
Tracking stays in the service repo. The HTTP contract copied into
`packages/core/openapi/veylqo.json` comes from `api/openapi/veylqo.json`
in that repo. Regenerate types with `pnpm --filter @veylqo/core generate`.

```bash
pnpm -r test
```

License: MIT.
