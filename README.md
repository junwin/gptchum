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
- `src/DataService.js` calls Lucy's `/chats`, `/events/<correlation_id>`, `/agents`, `/context/names`, `/upload/image`, and `/ask` endpoints and downloads generated videos.
- `src/stores/SettingStore.js` persists user preferences.
- `src/main.js` registers the PrimeVue controls and configures Markdown highlighting and theme switching.

Markdown rendering escapes raw HTML (`html: false` in MarkdownIt). A Shift+Enter inserts a line break; Enter sends the message.

## Delete an exchange

Use the ⋯ button beside a stored user message's name, choose **Delete exchange**,
and confirm removal of the message and its replies. The same button works by
ordinary tap, mouse click, or keyboard activation. It shares the existing header
and has a 44px touch target. There is no restore action.

The client calls Lucy's account/session-scoped
`DELETE /events/<correlation_id>?accountName=…&sessionId=…`, then reloads the
selected chat through `/chats/<id>` to rebuild messages and tool cards. Event IDs
and correlation IDs are retained on display cards. Deletion is unavailable for
missing or multiple correlation IDs, during response/history loading, or while
another deletion is pending. Failed requests retain the conversation and show
an error for retry. If deactivation succeeds but reloading fails, Refresh chats
retrieves the persisted result.

After a completed response, history is refreshed when the server has stored a
new user event for the request. Unsaved responses stay visible but cannot be
deleted until persisted identifiers are available. The correlation is taken
only from a stored user event's single association, never a timestamp or trace.

Requires Lucy's event endpoint (PR #264). Lucy #242 still tracks the independent
server-side restriction on deleting running exchanges; the browser disables its
own deletion controls during a response. Other tabs/clients can still be running.
This change does not deploy the built client.

Run the regression checks with `node --test tests/*.test.mjs` and `npm run build`.
