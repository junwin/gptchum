<template>
  <div class="chat-window">
    <ScrollPanel class="card-stack" ref="cardStack">
      <div
        v-for="message in currentMessages"
        :key="message.id || message.utc_timestamp || message.content"
        class="card"
        :class="cardClass(message)"
      >
        <!-- Tool card -->
        <template v-if="message.kind === 'tool'">
          <div class="participant-name tool-label">
            <span class="tool-icon">{{ toolIcon(message) }}</span>
            {{ message.tool_name || 'Tool' }}
          </div>
          <div class="message tool-card">
            <span class="tool-status">{{ message.content }}</span>
          </div>
        </template>

        <!-- Image card -->
        <template v-else-if="message.kind === 'image'">
          <div class="participant-name">
            {{ message.role === userName ? userName : assistantName }}
          </div>
          <div class="message image-card">
            <img
              v-if="message.image_url"
              :src="message.image_url"
              :alt="message.alt || 'Image'"
              class="chat-image"
            />
            <span v-if="message.alt" class="image-alt">{{ message.alt }}</span>
          </div>
        </template>

        <!-- Text card (default) -->
        <template v-else>
          <div class="participant-name">
            {{ message.role === userName ? userName : assistantName }}
            <span v-if="message.isStreaming" class="streaming-dots">
              <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
            </span>
          </div>
          <SafeMarkdown class="message" :source="message.content" />
          <div v-if="message.error" class="error-badge">Error</div>
        </template>
      </div>
    </ScrollPanel>

    <!-- Attachment previews -->
    <div class="attachments-row" v-if="attachments.length">
      <div
        v-for="(att, idx) in attachments"
        :key="idx"
        class="attachment-chip"
        :title="att.file.name"
      >
        <img v-if="isImageFile(att.file)" :src="att.preview" class="attachment-thumb" />
        <span v-else class="attachment-file-icon">📄</span>
        <span class="attachment-name">{{ att.file.name }}</span>
        <button class="attachment-remove" @click="removeAttachment(idx)" type="button">&times;</button>
      </div>
    </div>

    <div class="input-box">
      <!-- Hidden file input -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*,.md,.txt"
        multiple
        class="file-input-hidden"
        @change="addFiles"
      />

      <Button
        icon="pi pi-paperclip"
        class="p-button-text attach-btn"
        title="Attach file"
        @click="openFilePicker"
      />

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
    conversationId: String,
    contextName: String,
    currentMessages: Array,
  },
  components: {
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
            if (pre.querySelector('.code-copy-button')) return;
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

            pre.appendChild(btn);
          });
        };

        return () => {
          const html = md ? md.render(props.source || "") : (props.source || "");
          return h('div', {
            class: 'safe-markdown',
            innerHTML: html,
            ref: containerRef,
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
    const fileInput = ref(null);
    const attachments = ref([]);

    const scrollToBottom = () => {
      nextTick(() => {
        const el = cardStack.value?.$el;
        if (el) el.scrollTop = el.scrollHeight;
      });
    };

    const openFilePicker = () => {
      fileInput.value?.click();
    };

    const isImageFile = (file) => {
      return file.type && file.type.startsWith("image/");
    };

    const addFiles = (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        const preview = isImageFile(file) ? URL.createObjectURL(file) : null;
        attachments.value.push({ file, preview });
      }
      // Reset so the same file can be re-selected
      e.target.value = '';
    };

    const removeAttachment = (idx) => {
      if (attachments.value[idx].preview) {
        URL.revokeObjectURL(attachments.value[idx].preview);
      }
      attachments.value.splice(idx, 1);
    };

    const sendMessage = () => {
      const text = inputText.value.trim();
      const hasFiles = attachments.value.length > 0;
      if (!text && !hasFiles) return;

      const files = hasFiles ? attachments.value.map(a => a.file) : [];

      inputText.value = "";
      // Clean up object URLs
      attachments.value.forEach(a => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
      attachments.value = [];

      emit("new-message", {
        role: props.userName,
        content: text,
        contextName: props.contextName,
        files: files.length ? files : undefined,
      });
      scrollToBottom();
    };

    const cardClass = (message) => {
      if (message.kind === "tool") return "card-tool";
      if (message.kind === "image") return "card-image";
      if (message.error) return "card-error";
      if (message.isStreaming) return "card-streaming";
      return "";
    };

    const toolIcon = (message) => {
      if (message.ok === true) return "\u2705";  // checkmark
      if (message.ok === false) return "\u274C"; // cross
      return "\u23F3"; // hourglass (in progress)
    };

    onMounted(scrollToBottom);

    watch(
      () => props.currentMessages?.length,
      () => scrollToBottom()
    );

    return { inputText, cardStack, fileInput, attachments, sendMessage, openFilePicker, addFiles, removeAttachment, cardClass, toolIcon, isImageFile };
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

/* Tool cards */
.card-tool .tool-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.85rem;
  color: var(--text-color-secondary, #6b7280);
}

.tool-icon {
  display: inline-block;
  width: 1.2em;
  margin-right: 4px;
}

.tool-card {
  background: var(--surface-ground, #f3f4f6) !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.85rem;
  color: var(--text-color-secondary, #6b7280);
  padding: 6px 12px !important;
}

.tool-status {
  opacity: 0.85;
}

/* Image cards */
.card-image .image-card {
  padding: 4px !important;
  border: 1px solid var(--surface-border, #d3d3d3);
}

.chat-image {
  max-width: 100%;
  max-height: 400px;
  border-radius: 4px;
  display: block;
}

.image-alt {
  display: block;
  font-size: 0.8rem;
  color: var(--text-color-secondary, #6b7280);
  margin-top: 4px;
}

/* Streaming indicator */
.streaming-dots .dot {
  animation: blink 1.4s infinite both;
  font-weight: bold;
  font-size: 1.2rem;
  color: var(--primary-color, #3b82f6);
}

.streaming-dots .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.streaming-dots .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 80%, 100% { opacity: 0; }
  40% { opacity: 1; }
}

/* Error badge */
.error-badge {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #fee2e2;
  color: #dc2626;
  font-size: 0.75rem;
  font-weight: 600;
}

.card-error .message {
  border-color: #fca5a5;
  background: #fef2f2;
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
  position: relative;
  background: var(--surface-code-bg, #0b1220);
}

.card .message :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.card .message :deep(pre.hljs) {
  background: var(--surface-code-bg, #0b1220);
  color: var(--text-color, #e6edf3);
  padding: 0.75rem;
  border-radius: 6px;
}

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

/* --- Attachments --- */
.attachments-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 10px 0 10px;
}

.attachment-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px 2px 2px;
  background: var(--surface-ground, #f3f4f6);
  border: 1px solid var(--surface-border, #d3d3d3);
  border-radius: 6px;
  max-width: 200px;
}

.attachment-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
}

.attachment-file-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.attachment-name {
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

.attachment-remove {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--text-color-secondary, #6b7280);
  padding: 0 2px;
  line-height: 1;
}

.attachment-remove:hover {
  color: #dc2626;
}

.file-input-hidden {
  display: none;
}

/* --- Input box --- */
.input-box {
  display: flex;
  gap: 8px;
  padding: 10px;
  align-items: flex-end;
}

.input-box textarea {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
}

.attach-btn {
  flex-shrink: 0;
  margin-bottom: 2px;
}
</style>
