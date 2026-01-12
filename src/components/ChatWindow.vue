<template>
  <div class="chat-window">
    <ScrollPanel class="card-stack" ref="cardStack">
      <div v-for="message in currentMessages" :key="message.id || message.utc_timestamp || message.content" class="card">
        <div class="participant-name">
          {{ message.role === userName ? userName : assistantName }}
        </div>
        <Textarea class="message" :rows="calcRows(message.content)" :value="message.content" readonly autoResize />
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
import { ref, onMounted, nextTick, watch } from "vue";

export default {
  props: {
    assistantName: String,
    userName: String,
    conversationId: String, // this will be the GUID session id now
    contextName: String,
    currentMessages: Array,
  },
  setup(props, { emit }) {
    const inputText = ref("");
    const cardStack = ref(null);

    const calcRows = (content) => (content ? content.split("\n").length : 1);

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

    return { inputText, cardStack, sendMessage, calcRows };
  },
};
</script>
<style scoped>
  /* Make the chat window use all available width */
.chat-window {
  width: 100%;
  height: calc(100vh - 250px);
  display: flex;
  flex-direction: column;
}

/* Allow ScrollPanel content to expand fully */
.card-stack {
  flex: 1;
  width: 100%;
  padding: 12px;
  box-sizing: border-box;
}

/* Each message card should span the full width */
.card {
  width: 100%;
  margin-bottom: 12px;
}

/* Message text should fill the card */
.card .message {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 8px;
  resize: vertical;
}

/* Input area should also be full width */
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
