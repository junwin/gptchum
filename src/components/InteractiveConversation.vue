<template>
  <div class="interactive-conversation">
    <div class="response-container">
      <transition-group name="response" tag="div">
        <div v-for="(response, index) in responses" :key="index" class="response-card">
          <Card>
            <template #title>
              <span :class="{ 'small-font': response.role === 'agent' || response.role === 'account' }">
                {{ response.role }}
              </span>
            </template>
            <template #content>
              <div class="card-textarea-wrapper">
                <Textarea readonly :value="response.content" class="w-full" :rows="calculateRows(response.content)" />
              </div>
            </template>
          </Card>
        </div>
      </transition-group>
    </div>

  </div>
</template>

  
<script>
import { nextTick } from 'vue';

export default {
  name: 'InteractiveConversation',
  props: {
    responses: Array,
  },
  methods: {
    scrollToLatestResponse() {
      const responseCards = document.querySelectorAll('.response-card');
      if (responseCards.length) {
        responseCards[responseCards.length - 1].scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }
    },
    calculateRows(text) {
      return (text.match(/\n/g) || []).length + 2;
    },
    async fetchPrompts() {
      try {
        this.isLoading = true;
        const prompts = await this.dataService.getPrompts(
          this.selectedAgent.name,
          this.accountName,
          this.selectedConversationId
        );
        this.prompts = prompts;
      } catch (error) {
        console.error("Error fetching prompts:", error);
      } finally {
        this.isLoading = false;
      }
    },
  },
  watch: {
    responses: {
      handler() {
        nextTick(() => {
          this.scrollToLatestResponse();
        });
      },
      deep: true,
    },
  },
};
</script>
  
<style scoped>
.question-section {
  flex-shrink: 0;
  display: flex;
  position: sticky;
  /* Add this line */
  bottom: 0;
  /* Add this line */
  background-color: white;
  /* Add this line */
  padding: 1rem;
  /* Add this line */
  box-shadow: 0 -3px 5px rgba(0, 0, 0, 0.1);
  /* Add this line */
  z-index: 1;
  /* Add this line */
}

.interactive-conversation {
  height: 80%;
  /* Change this to the desired height */
  width: 100%;
  display: flex;
  flex-direction: column;
}

.response-container {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1rem;
}

.response-card {
  margin-bottom: 1rem;
}

.card-textarea-wrapper {
  display: flex;
  flex-grow: 1;
}

.card-textarea-wrapper .p-textarea .p-inputtext {
  flex-grow: 1;
  width: auto !important;
}


.response-enter-active,
.response-leave-active {
  transition: transform 0.3s ease-out;
}

.response-enter,
.response-leave-to {
  transform: translateY(100%);
}



.p-toolbar-group-left {
  width: 70%;
}

.p-toolbar-group-right {
  width: 30%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.small-font {
  font-size: 0.8rem;
}
</style>
  