<template>
  <div class="chat-window">
    <ScrollPanel class="card-stack" ref="cardStack">
      <div v-for="message in currentMessages" :key="message.id" class="card">
        <div class="participant-name">{{ message.role === userName ? userName : assistantName }}</div>
        <TextArea class="message" :rows="calcRows(message.content)" :value="message.content" readonly autoResize />
      </div>
    </ScrollPanel>
    <div class="input-box">
      <Textarea v-model="inputText" placeholder="Enter your message" autoResize />
      <Button label="Send" @click="sendMessage" />
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue';

export default {
  props: {
    assistantName: String,
    userName: String,
    conversationId: String,
    currentMessages: Array,
  },
  setup(props, { emit }) {
    const inputText = ref('');
    const cardStack = ref(null);

    const sendMessage = () => {
      if (inputText.value.trim() !== '') {
        const newMessage = {
          id: Date.now().toString(),
          role: props.userName,
          content: inputText.value.trim(),
          conversation_id: props.conversationId,
        };
        inputText.value = '';
        scrollToBottom();
        emit('new-message', newMessage);
      }
    };

    const calcRows = (content) => {
      return content.split('\n').length;
    };

    const scrollToBottom = () => {
      nextTick(() => {
        if (cardStack.value) {
          cardStack.value.$el.scrollTop = cardStack.value.$el.scrollHeight;
        }
      });
    };


    onMounted(() => {
      scrollToBottom();
    });

    return {
      inputText,
      sendMessage,
      calcRows,
      scrollToBottom,
    };
  },
};
</script>

<style scoped>
.chat-window {
  height: calc(100vh - 250px);
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  color: var(--text-color);
}

.card-stack {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.card {
  margin-bottom: 10px;
}

.participant-name {
  font-weight: bold;
}

.input-box {
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: var(--input-bg-color);
}

.input-box textarea {
  flex: 1;
  padding: 5px;
  margin-right: 10px;
  background-color: inherit;
  color: inherit;
}

.input-box button {
  padding: 5px 10px;
}

.card .message {
  width: 100%;
  min-height: 40px;
  resize: vertical;
  padding: 5px;
  margin-top: 5px;
  overflow-y: auto;
  background-color: #242323;
  color: #f2f2f2;
}
</style>
