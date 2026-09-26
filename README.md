# gptChum

A Vue 3/Vite chat client for Lucy. The active UI is `Chat2.vue` and its `ChatWindow.vue` child. It supports chat sessions, agent and context selection, streamed replies, tool status chips, image attachments, generated images and videos, Markdown, and a persisted light/dark theme.

## Run

```sh
npm ci
npm run dev
```

Build for deployment with `npm run build`.

Open Preferences in the toolbar to set the Lucy endpoint, API key, and account name. Settings are stored in browser local storage. The default endpoint is `http://localhost:5000`.

## Code map

- `src/components/Chat2.vue` manages sessions, requests, and streamed events.
- `src/components/ChatWindow.vue` renders messages and the composer. It owns the Markdown copy buttons.
- `src/DataService.js` calls Lucy's `/chats`, `/agents`, `/context/names`, `/upload/image`, and `/ask` endpoints and downloads generated videos.
- `src/stores/SettingStore.js` persists user preferences.
- `src/main.js` registers the PrimeVue controls and configures Markdown highlighting and theme switching.

Markdown rendering escapes raw HTML (`html: false` in MarkdownIt). A Shift+Enter inserts a line break; Enter sends the message.
