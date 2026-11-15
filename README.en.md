# PresenceStyle (`@porbit/style`)

[Tiếng Việt](./README.md) · English

A utility CSS engine that turns short class names into real CSS **at runtime** (no build step required) or **at build time** (static extraction, Vite plugin). It is an open formula rather than a closed class set: every CSS property and value can be written as a class, and priority is explicit through numeric cascade layers.

```html
<script type="module" src="https://unpkg.com/@porbit/style/dist/index-auto.mjs"></script>

<button class="dF aiC jcC p10px;16px bdN bdra8px bgc#0a64e8 cWhite opc0.9@:hover">
  Sign in
</button>
```

## Install

```bash
npm install @porbit/style
```

Node.js 20+ for the CLI, SSR and the MCP server. No runtime dependencies.

## Syntax

```text
[media:][layer]property value[@selector]

md : 2 bgc #0a64e8 @:hover
│    │ │   │        └─ selector (optional): @:hover, @::before, @;li (";" = space)
│    │ │   └────────── value: #0a64e8 | Red | 10px | [calc(100%_-_10px)]
│    │ └────────────── property alias (bgc = background-color) or any full CSS name
│    └──────────────── layer (optional): higher number always wins
└───────────────────── media (optional): xs sm md lg xl 2xl sma mda lga xla or custom
```

Four rules cover most cases:

1. The property is a run of lowercase letters; it stops at the first uppercase letter, digit, `#`, `!`, `[` or `%`.
2. Word values start with an uppercase letter: `dF` (flex), `aiC` (center), `posR` (relative). `df` is wrong.
3. Spaces inside a value are written `;` (`p8px;16px`) or `_` inside brackets (`w[calc(100%_-_2rem)]`).
4. States are suffixes: `cRed@:hover`, not `hover:cRed`.

Any CSS property works by its full name: `view-transition-name[hero]`, `-webkit-line-clamp[3]`, `--brand[#0a64e8]`. Aliases are listed in [DICTIONARY.md](./DICTIONARY.md).

## Run Tailwind v4 Classes, Rendered Like Tailwind

The v4 dialect is generated from Tailwind's own compiler. Measured in Chromium against tailwindcss 4.3.5: **23,285/23,286 classes** and **680/680** variant combinations render identically; theme, `@utility` and `@apply` 28/28.

No build step (replaces `@tailwindcss/browser`: 55.6 KB vs 75.3 KB gzip, ~35% faster to first styled frame):

```html
<script type="module" src="https://unpkg.com/@porbit/style/dist/tailwind-auto.mjs"></script>
<style type="text/tailwindcss">@theme { --color-brand: #0a64e8; }</style>
<div class="flex items-center gap-4 p-4 rounded-lg bg-brand/90 hover:bg-brand md:grid-cols-3">…</div>
```

With Vite (zero runtime JS, like Tailwind): `presenceStyle({ dialects: [tailwindV4Dialect({ preflight: true })] })`. Details and limits: [docs/guides/tailwind.md](./docs/guides/tailwind.md) (Vietnamese).

## Static-First and Vite

```js
// vite.config.js
import presenceStyle from '@porbit/style/vite'
export default { plugins: [presenceStyle()] }

// main.js
import 'virtual:presence-style.css'
import manifest from 'virtual:presence-style-manifest'
xcss.cssObserve(document, { hashClassName: false, preload: { ...manifest, skipInitialScan: true } })
```

On 3,000 nodes (Chromium) start-up drops from ~24 ms (pure runtime) to ~2.7 ms. Without a bundler: `npx presence-style extract src --out presence.css --manifest presence-manifest.json`.

## Components

`@porbit/style/components` ships variant recipes (button, badge, card, form fields, alert, avatar, navbar, tabs, table, modal, progress, skeleton, spinner, breadcrumb, pagination, tooltip, layout helpers) themed by `--ps-*` custom properties, light and dark.

```js
import { componentTheme, button } from '@porbit/style/components'
xcss.cssObserve(document, { base: componentTheme })
button({ variant: 'outline', size: 'sm' }) // class string
```

Override recipe classes with layer 2 or higher: `button({ class: '2bdra999px' })`.

## AI Agents (MCP)

The package includes an MCP server so agents can validate, fix and generate classes instead of guessing:

```bash
claude mcp add presence-style --scope user -- npx -y @porbit/style mcp
codex mcp add presence-style -- npx -y @porbit/style mcp
gemini mcp add presence-style npx -y @porbit/style mcp
npx -y @porbit/style mcp-config   # Cursor, VS Code, Windsurf, Claude Desktop, Cline, Zed, opencode
```

Tools: `fix_classes`, `explain_class`, `generate_css`, `extract_css`, `lookup_dictionary`, `convert_tailwind`, `list_components`, `get_component`, `get_theme`. Add project rules for agents with `npx presence-style init --agents`. A compact reference for LLMs lives in [llms.txt](./llms.txt).

## CLI

| Command | Purpose |
| :--- | :--- |
| `presence-style extract <paths> --out f.css [--manifest m.json]` | Static CSS (and manifest) from source files |
| `presence-style check <paths>` | Report classes that produce no CSS (with fixes) and conflicting classes; exit 1 on problems |
| `presence-style sort <paths> [--write \| --check]` | Sort classes in static class attributes |
| `presence-style init [--agents] [--mcp]` | Create config, agent rules and `.mcp.json` |
| `presence-style mcp` / `mcp-config [client]` | Run the MCP server / print client setup |

## Editor

A VS Code extension (diagnostics, quick fixes, hover CSS, completion, sort command) lives in [editors/vscode](./editors/vscode).

## When to Choose It

| Your project | Good fit |
| :--- | :--- |
| UI driven by data or users (page builders, CMS, themes) | **PresenceStyle** |
| No build step, embeddable widgets, plain HTML | **PresenceStyle** (CDN build, 21 KB gzip) |
| Web Components / Shadow DOM | **PresenceStyle** |
| Fixed UI with a build, zero JS for CSS required | Tailwind, or PresenceStyle static-first |

The full evaluation (Vietnamese) is in [docs/strategy/danh-gia-va-dinh-huong.md](./docs/strategy/danh-gia-va-dinh-huong.md).

## License

MIT. See [LICENSE](./LICENSE).
