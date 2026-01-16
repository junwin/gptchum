# gptchum

This is a Vue 3 + Vite app built with PrimeVue components. The app is a lightweight chat UI that communicates with the `lucy` backend and supports named "contexts" so the backend can route requests.

Key features:
- Context support: requests include a context name (defaults to `default` if not provided).
- Theme toggle (light/dark) persisted in localStorage and applied on load.
- Safe Markdown rendering with code-block highlighting and a per-block copy button (raw HTML in source is escaped by default).

---

## New / required dependencies

The project uses the following packages (install if you clone the repo):

- primevue
- primeicons
- primeflex
- pinia
- markdown-it
- highlight.js

Optional (recommended for extra sanitization):

- dompurify

Install with:

```sh
npm install primevue primeicons primeflex pinia markdown-it highlight.js
# Optional: for extra HTML sanitization
npm install dompurify
```

(Other dependencies come from the original starter template; run `npm install` normally to pick them up.)

---

## Setup

1. Install dependencies:

```sh
npm install
npm install primevue primeicons primeflex pinia markdown-it highlight.js
# Optional: for extra HTML sanitization
npm install dompurify
```

2. Start development server:

```sh
npm run dev
```

3. Build for production:

```sh
npm run build
```

---

## Code blocks: copy button and syntax highlighting

The app already includes a lightweight SafeMarkdown renderer (registered globally in `src/repos/gptchum/src/main.js` as `SafeMarkdown`) and a local override is used inside `src/repos/gptchum/src/components/ChatWindow.vue` so message rendering can add per-code-block copy buttons.

Implementation notes:

- Markdown rendering and highlighting
  - markdown-it is configured with `html: false` (raw HTML disabled), `linkify: true`, and a `highlight` function that uses `highlight.js` to produce highlighted HTML. This renderer is exposed to components via `app.config.globalProperties.$md`.
  - highlight.js stylesheet is loaded globally (the project currently uses `highlight.js/styles/github.css`).

- Per-code-block copy button
  - The SafeMarkdown implementation looks for `pre.hljs` blocks, wraps each in a relatively-positioned wrapper, and appends a small "Copy" button positioned at the top-right of the block. Clicking it copies the code text to the clipboard and briefly shows a "Copied!" state.
  - Minimal CSS for the button and code blocks is injected once by the SafeMarkdown component at runtime.

Files to inspect / customize:

- `src/repos/gptchum/src/main.js` — markdown-it configuration, highlight.js import, global SafeMarkdown component that injects styles and enhances code blocks.
- `src/repos/gptchum/src/components/ChatWindow.vue` — uses a local SafeMarkdown component (so the chat window's renderer can be tweaked without touching the global registration).

If you want to customize the appearance of code blocks or the copy button, edit the injected style block in `main.js` or add your own global stylesheet rules that target `.safe-markdown pre.hljs` and `.safe-markdown .copy-btn`.

Sanitization note (XSS safety):

- The app currently disables raw HTML in markdown-it (`html: false`) which means markdown source like `<script>` will be escaped rather than executed. This is a good baseline safety measure.
- If you want an extra layer of protection (recommended when rendering untrusted content), install `dompurify` and sanitize the generated HTML before inserting it into the DOM. Example change in `main.js` / SafeMarkdown usage:

```js
import DOMPurify from 'dompurify'
// ...
root.value.innerHTML = DOMPurify.sanitize(md.render(props.source || ''))
```

This is optional but recommended for high-threat environments.

---

## Context support (verified)

The app includes context support and the DataService sends the selected context name with requests to Lucy. The methods `askQuestion` and `askQuestionMultiAgent` in `src/repos/gptchum/src/DataService.js` include `contextName` in the POST payload. There is also a `getContextNames` method to fetch available context names from the backend.

The selected context is persisted to localStorage under the key `gptchum_context` and is available from the settings store (Pinia). If no context is supplied by the user, the app uses `default`.

---

## Theme toggle

- The app supports two themes: `light` and `dark`.
- The selected theme is stored in localStorage under the key `gptchum_theme` (`"light"` or `"dark"`).
- The SettingStore applies the persisted theme on initialization and the runtime code dynamically loads the corresponding PrimeVue theme CSS so the UI updates immediately.

Programmatic usage:
- From within a Vue component you can access the settings store (Pinia) and toggle the theme: `const store = useSettingStore(); store.toggleTheme()` or `store.setTheme('dark')`.
- The app watches the store and will re-apply the appropriate PrimeVue theme CSS automatically.

Note: there may not be a built-in toggle button in the minimal UI; you can add one calling the store methods above.

---

## Markdown rendering and security (summary)

- Markdown is rendered with `markdown-it` with `html: false` to prevent raw HTML execution.
- Syntax highlighting is handled by `highlight.js` via a custom highlight function on the markdown-it instance. Code blocks are rendered as `<pre class="hljs"><code class="language-...">...</code></pre>` so standard highlight.js styles apply.
- Each code block receives a copy button overlay implemented by the SafeMarkdown enhancement code.
- For maximum safety, use `dompurify` to sanitize HTML output from the renderer before inserting it into the page.

---

## Storage keys

- Theme: `gptchum_theme` (value: `"light"` or `"dark"`).
- Context: `gptchum_context` (value: string).

---

## Developer notes / Tips

- PrimeVue theme CSS is managed by a single `<link>` tag swapped at runtime (`main.js`). This avoids piling CSS into the page from multiple dynamic imports.
- The settings store (Pinia) is provided globally so components can read/update theme and context state. In code, `useSettingStore()` is the primary interface.
- Messages are rendered as safe markdown (see above) where used; in some places the UI may render plain text (for example message editing fields) to avoid accidental HTML.

---

## Running and debugging

- Run `npm run dev` to start the app.
- Open the browser console and check localStorage to inspect `gptchum_theme` and `gptchum_context`.
- Use Vue Devtools to inspect the Pinia store and call `toggleTheme()` interactively if you want to test theme switching.

---

If you want, I can:
- Add a visible theme toggle button in the toolbar and wire it to the settings store.
- Add a small visual indicator of the current theme in the UI.
- Add DOMPurify sanitization to the SafeMarkdown implementation (quick change to `main.js` shown above).

Questions:
1. Do you want a visible theme toggle in the UI (and if so, in which component/toolbar should it appear)?
2. Would you like me to apply DOMPurify sanitization automatically (I can update `main.js` to add it)?
3. Do you want different highlight.js styling (e.g., `github-dark`, `atom-one-dark`, etc.) or to switch to Prism.js instead?
