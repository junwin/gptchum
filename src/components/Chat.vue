<template>
    <div style="width: 100%; height: 100%">
      <div class="toolbar-container">
        <div class="p-mr-2">
          <Dropdown id="agentDropdown" v-model="selectedAgent" :options="agents" optionLabel="name" />
        </div>
  
        <span class="p-float-label p-mr-2">
          <label for="accountName">Account Name:</label>
          <InputText type="text" id="accountName" v-model="accountName" />
        </span>
  
        <span class="p-float-label p-mr-2">
          <label for="convId">Conversation Id:</label>
          <InputText id="convId" v-model="conversationId" />
        </span>
        <div class="p-mr-2">
          <Button label="Send" @click="ask" :disabled="isLoading" />
        </div>
      </div>
  
      <div>
        <Textarea id="question" v-model="question" :rows="7" :spellcheck="spellcheck" :lang="language" class="w-full" />
      </div>
      <div>
        <Textarea id="answer" v-model="answer" :rows="12" :spellcheck="spellcheck" :lang="language" class="w-full" />
      </div>
  
      <Speech @speechResult="onSpeechResult" ref="speechComponent" :textToSpeak="answer" />
    </div>
  </template>
  
  <style scoped>
  .toolbar-container {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    width: 100%;
    padding: 0.5rem;
    background-color: #f5f5f5;
    border: 1px solid #d3d3d3;
  }
  </style>
  
  
  <script>
  import DataService from "../DataService";
  import { useSettingStore } from "../stores/SettingStore.js";
  import Speech from "./Speech.vue";
  
  export default {
    components: {
      Speech,
    },
    name: "Chat",
    data() {
      return {
        agents: [],
        selectedAgent: "",
        accountName: "",
        question: "",
        answer: "",
        selectedVoice: null,
  
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
        try {
          const response = await this.dataService.askQuestion(
            this.question,
            this.selectedAgent.name,
            this.accountName,
            this.conversationId,
            this.selectType
          );
          this.answer = response.response;
        } catch (error) {
          this.answer = "Error occurred while processing the question.";
        }
        this.isLoading = false;
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
    },
  };
  </script>
  