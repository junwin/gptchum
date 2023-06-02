<template>
  <div class="chat-window">
      <div class="card-stack" ref="cardStack">
          <!-- Render the cards here -->
          <div v-for="message in currentMessages" :key="message.id" class="card">
              <div class="participant-name">{{ message.role === userName ? userName : assistantName }}</div>
              <textarea class="message" :rows="calcRows(message.content)" :value="message.content" readonly></textarea>
          </div>
      </div>
      <div class="input-box">
          <textarea v-model="inputText" placeholder="Enter your message"></textarea>
          <button @click="sendMessage">Send</button>
      </div>
  </div>
</template>

  
  
<script>
export default {
    props: {
        assistantName: String,
        userName: String,
        conversationId: String,
        currentMessages: Array
    },
    data() {
        return {
            messages: [],
            inputText: ''
        };
    },
    mounted() {
        // Set the initial messages
        //this.currentMessages = this.currentMessages;
        // Scroll to the bottom of the card stack
        this.scrollToBottom();
    },
    methods: {
        sendMessage() {
            if (this.inputText.trim() !== '') {
                const newMessage = {
                    id: Date.now().toString(),
                    role: this.userName,
                    content: this.inputText.trim(),
                    conversation_id: this.conversationId
                };
                //this.messages.push(newMessage);
                this.inputText = '';
                this.scrollToBottom();

                // Emit an event with the new message for the parent component to process
                this.$emit('new-message', newMessage);
            }
        },
        calcRows(content) {
            return content.split('\n').length;
        },
        scrollToBottom() {
            // Scroll to the bottom of the card stack
            this.$nextTick(() => {
                this.$refs.cardStack.scrollTop = this.$refs.cardStack.scrollHeight;
            });
        }
    }
};
</script>
  
<style scoped>
.chat-window {
  height: calc(100vh - 250px); /* Adjust the height as needed */
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
  color:  #f2f2f2
}
</style>
  
  
  