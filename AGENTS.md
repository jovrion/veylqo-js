# veylqo-js — Agent Instructions

SDK for Veylqo. Vanilla Web Component, no runtime framework.
Remote: `git@github.com-unisimon:jovrion/veylqo-js.git`.

## Where decisions live

Tracking, ADRs, and the HTTP contract are not in this repo.

- Board and tasks: `jovrion/veylqo` `work/` (area `js`).
  Remote `git@github.com-unisimon:jovrion/veylqo.git`.
- Contract: `api/openapi/veylqo.json` in that repo. Do not invent fields.
- HTTP semantics: `docs/adr/` there. Do not keep a second decision log here.

## Layout

pnpm workspace (`pnpm-workspace.yaml`):

| Path | Name |
| --- | --- |
| `packages/core` | `@veylqo/core` |
| `packages/element` | `@veylqo/element` |
| `packages/cdn` | `@veylqo/cdn` |

`@veylqo/core` implements `shorten()` and `share()`. `element` and `cdn`
are still empty scaffolds. Do not claim `<veylqo-share>` exists until
its task is `done` on the board.

## Rules

- No React, Vue, Lit, or other UI runtime dependency.
- `@changesets/cli` is a root devDependency only.
- The publishable key may appear in examples later. The admin token must not.
- Do not commit secrets. Do not commit or push unless asked.
- Tests use Node's built-in runner: `pnpm -r test`.
