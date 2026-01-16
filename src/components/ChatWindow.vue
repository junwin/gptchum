<template>
  <div class="chat-window">
    <ScrollPanel class="card-stack" ref="cardStack">
      <div
        v-for="message in currentMessages"
        :key="message.id || message.utc_timestamp || message.content"
        class="card"
      >
        <div class="participant-name">
          {{ message.role === userName ? userName : assistantName }}
        </div>

        <!-- Local SafeMarkdown overrides global one so we can add copy buttons to code blocks -->
        <SafeMarkdown class="message" :source="message.content" />
      </div>
    </ScrollPanel>

    <div class="input-box">
      <Textarea
        v-model="inputText"
        placeholder="Enter your message"
        autoResize
        @keydown.enter.exact.prevent="sendMessage"
        @keydown.enter.shift.exact.stop
      />
      <Button label="Send" @click="sendMessage" />
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick, watch, getCurrentInstance, h } from "vue";

export default {
  props: {
    assistantName: String,
    userName: String,
    conversationId: String, // this will be the GUID session id now
    contextName: String,
    currentMessages: Array,
  },
  components: {
    // Local SafeMarkdown component uses the app's configured markdown-it renderer
    // (registered on app.config.globalProperties.$md in main.js). We render with v-html
    // (markdown-it is configured with html: false) and then enhance code blocks by
    // adding a copy button overlay per <pre>.
    SafeMarkdown: {
      props: ["source"],
      setup(props) {
        const containerRef = ref(null);
        const instance = getCurrentInstance();
        const md = instance?.appContext?.config?.globalProperties?.$md;

        const addCopyButtons = () => {
          const el = containerRef.value;
          if (!el) return;

          const pres = el.querySelectorAll("pre");
          pres.forEach((pre) => {
            // avoid adding multiple buttons
            if (pre.querySelector('.code-copy-button')) return;

            // make sure pre is positioned so the button can be absolutely placed
            pre.style.position = pre.style.position || "relative";

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "code-copy-button";
            btn.innerText = "Copy";

            btn.addEventListener("click", async (ev) => {
              ev.stopPropagation();
              const code = pre.querySelector("code");
              const text = code ? code.innerText : pre.innerText;
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(text);
                } else {
                  // fallback
                  const textarea = document.createElement("textarea");
                  textarea.value = text;
                  textarea.style.position = "fixed";
                  textarea.style.opacity = "0";
                  document.body.appendChild(textarea);
                  textarea.focus();
                  textarea.select();
                  document.execCommand("copy");
                  document.body.removeChild(textarea);
                }
                const original = btn.innerText;
                btn.innerText = "Copied";
                setTimeout(() => (btn.innerText = original), 1500);
              } catch (e) {
                btn.innerText = "Error";
                setTimeout(() => (btn.innerText = "Copy"), 1500);
              }
            });

            // place button into pre
            pre.appendChild(btn);
          });
        };

        // expose render function
        return () => {
          const html = md ? md.render(props.source || "") : (props.source || "");
          // we must set innerHTML; markdown-it is configured with html: false in main.js
          // so raw HTML in the source will be escaped. We then run a small enhancement to
          // add copy buttons. Because we manipulate DOM directly, we use nextTick to add buttons.
          return h('div', {
            class: 'safe-markdown',
            innerHTML: html,
            ref: containerRef,
            // after vnode mounted we need to schedule copy button addition
            onVnodeMounted: () => { nextTick(addCopyButtons); },
            onVnodeUpdated: () => { nextTick(addCopyButtons); }
          });
        };
      },
    },
  },
  setup(props, { emit }) {
    const inputText = ref("");
    const cardStack = ref(null);

    const scrollToBottom = () => {
      nextTick(() => {
        const el = cardStack.value?.$el;
        if (el) el.scrollTop = el.scrollHeight;
      });
    };

    const sendMessage = () => {
      const text = inputText.value.trim();
      if (!text) return;

      inputText.value = "";
      emit("new-message", {
        role: props.userName,
        content: text,
        contextName: props.contextName,
      });
      scrollToBottom();
    };

    onMounted(scrollToBottom);

    // keep view pinned to bottom when parent loads new history
    watch(
      () => props.currentMessages?.length,
      () => scrollToBottom()
    );

    return { inputText, cardStack, sendMessage };
  },
};
</script>

<style scoped>
.chat-window {
  width: 100%;
  height: calc(100vh - 250px);
  display: flex;
  flex-direction: column;
}

.card-stack {
  flex: 1;
  width: 100%;
  padding: 12px;
  box-sizing: border-box;
}

.card {
  width: 100%;
  margin-bottom: 12px;
}

.participant-name {
  font-weight: 600;
  margin-bottom: 6px;
}

/* Markdown output container */
.card .message {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--surface-border, #d3d3d3);
  border-radius: 8px;
  background: var(--surface-card, #ffffff);
  color: var(--text-color, #111827);
}

/* Make markdown look decent */
.card .message :deep(p) {
  margin: 0 0 0.75rem 0;
}

.card .message :deep(p:last-child) {
  margin-bottom: 0;
}

.card .message :deep(pre) {
  overflow: auto;
  padding: 0.75rem;
  border-radius: 6px;
  position: relative; /* allow absolute button inside */
  background: var(--surface-code-bg, #0b1220);
}

.card .message :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

/* Highlight.js default styles are loaded globally (github.css). Provide small tweaks for dark backgrounds */
.card .message :deep(pre.hljs) {
  background: var(--surface-code-bg, #0b1220);
  color: var(--text-color, #e6edf3);
  padding: 0.75rem;
  border-radius: 6px;
}

/* Copy button overlay */
.card .message :deep(.code-copy-button) {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.1);
  background: rgba(255,255,255,0.9);
  color: #111;
  cursor: pointer;
}

.card .message :deep(.code-copy-button):hover {
  background: rgba(255,255,255,1);
}

.input-box {
  display: flex;
  gap: 8px;
  padding: 10px;
}

.input-box textarea {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
}
</style>
