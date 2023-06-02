<template>
  <div :class="['app-container', { 'dark-theme': isDarkMode }]">
    <div class="toolbar-container">
      <div class="p-mr-2">
        <Dropdown id="agentDropdown" v-model="selectedAgent" :options="agents" optionLabel="name" />
      </div>

      <span class="p-float-label p-mr-2">
        <label for="accountName">Account Name:</label>
        <InputText type="text" id="accountName" v-model="accountName" />
      </span>

      <div class="p-float-label p-mr-2">
        <label for="conversationIdDropdown">Conversation ID:</label>
        <Dropdown id="conversationIdDropdown" v-model="selectedConversationId" :options="conversationIds" optionLabel="id" />
      </div>

      <div class="p-mr-2">
        <Button label="Fetch Prompts" @click="fetchPrompts" />
      </div>
    </div>

    <div class="p-mr-2">
      <ChatWindow :assistantName="selectedAgent.name" :userName="accountName" :conversationId="selectedConversationId"
        :currentMessages="responses" @new-message="handleNewMessage" />
    </div>
  </div>
</template>

  
<style scoped>
.app-container {
  width: 100%;
  height: 100%;
}

.toolbar-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  width: 100%;
  padding: 0.5rem;
  background-color: #f5f5f5;
  border: 1px solid #d3d3d3;
}
.dark-theme {
  --bg-color: #1a1a1a;
  --text-color: #ffffff;
  --input-bg-color: #ffffff;
}

@media (prefers-color-scheme: light) {
  .dark-theme {
    --bg-color: #ffffff;
    --text-color: #000000;
    --input-bg-color: #f2f2f2;
  }
}
</style>
  
  
<script>
import DataService from "../DataService";
import { useSettingStore } from "../stores/SettingStore.js";
import ChatWindow from "./ChatWindow.vue";

export default {
    components: {
        ChatWindow,
    },
    name: "Chat2",
    data() {
        return {
            responses: [{ role: 'lucy', content: 'Hello! How can I help you?' }],
            agents: [],
            selectedAgent: "",
            accountName: "",
            question: "",
            answer: "",
            selectedVoice: null,
            conversationIds: [],
            selectedConversationId: null,
            isLoading: false,
            speaking: false,
            conversationId: this.getCurrentDateYYYYMMDD(),
            selectType: "",
            language: "es-ES",
            spellcheck: "false",
            dataService: null,
            store: null,
        };
    },
    mounted() {
        this.store = useSettingStore();
        this.dataService = this.store.dataService;
        this.selectedAgent = this.store.getAgentName;
        this.accountName = this.store.getAccountName;
        this.fetchAgentNames();
        this.conversationId = this.getCurrentDateYYYYMMDD();
    },
    watch: {
        selectedAgent(newAgentName) {
            this.store.agentName = newAgentName;
        },
        accountName(newAccountName) {
            this.store.accountName = newAccountName;
        },
    },
    computed: {
        isVoiceDisabled() {
            return this.isLoading || !this.selectedVoice;
        },
    },
    methods: {
        async ask() {
            this.isLoading = true;
            //this.responses.push({ role: this.accountName, content: this.question });
            try {
                const response = await this.dataService.askQuestion(
                    this.question,
                    this.selectedAgent.name,
                    this.accountName,
                    this.conversationId,
                    this.selectType
                );
                this.answer = response.response;
                this.responses.push({ role: this.selectedAgent.name, content: this.answer });
            } catch (error) {
                this.answer = "Error occurred while processing the question.";
            }
            this.isLoading = false;
        },
        handleNewMessage(message) {
            // Process the new message here
            this.question = message.content;
            this.ask();
            console.log('New message:', message);
        },
        getCurrentDateYYYYMMDD() {
            const date = new Date();
            const year = date.getFullYear();
            const month = ('0' + (date.getMonth() + 1)).slice(-2); // Add 1 to month because it is 0-indexed
            const day = ('0' + date.getDate()).slice(-2);

            return `${year}${month}${day}`;
        },
        async fetchAgentNames() {
            try {
                const agentNames = await this.dataService.getAgentNames();
                this.agents = agentNames.map(agentName => ({ name: agentName }));
            } catch (error) {
                console.error("Error fetching agent names:", error);
            }
        },
        onSpeechResult(result) {
            this.question = result;
        },
        async fetchConversationIds() {
            try {
                const response = await this.dataService.getConversationIds(this.selectedAgent.name, this.accountName);
                this.conversationIds = response.map(id => ({ id }));
                this.selectedConversationId = this.conversationIds.length > 0 ? this.conversationIds[0].id : null;
            } catch (error) {
                console.error(error);
            }
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
};
</script>
  