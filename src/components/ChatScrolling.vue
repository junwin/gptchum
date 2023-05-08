<template>
    <div class="parent-container" v-bind:style="{ width: '100%', height: '100%' }">
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

        </div>


        <div class="chat-container">
            <InteractiveConversation :responses="responsesZZ" @send="addResponse" />
            <div class="input-send-container">
                <div class="input-container">
                    <Textarea class="question-input" v-model="question" placeholder="Type your question here..." />
                </div>
                <div class="send-button-container">
                    <Button label="Send" @click="ask" :disabled="isLoading" />
                </div>
            </div>
        </div>
    </div>
</template>
  
<style scoped>
.parent-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
    /* Remove this line */
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

.chat-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.input-send-container {
    flex-shrink: 0;
    display: flex;
    background-color: white;
    padding: 1rem;
    box-shadow: 0 -3px 5px rgba(0, 0, 0, 0.1);
    z-index: 1;
}

.input-container {
    flex-grow: 1;
}

.send-button-container {
    display: flex;
    align-items: center;
}
</style>
  

<script>

import { ref } from 'vue';

const items = ref(Array.from({ length: 100000 }).map((_, i) => `Item #${i}`));

import DataService from "../DataService";
import { useSettingStore } from "../stores/SettingStore.js";
import Speech from "./Speech.vue";


export default {
    components: {
        Speech,
    },
    name: "ChatScrolling",
    setup() {
        const testResponses = ref([
            { role: 'accountName', content: 'Hello! How can I help you?' },
            { role: 'agentName', content: 'I would like to know more about your services.' },
            { role: 'accountName', content: 'We offer various services including A, B, and C. Which one would you like to know more about?' },
            { role: 'agentName', content: 'I am interested in service B.' },
            { role: 'accountName', content: 'Service B is designed for customers who ...' },
        ]);



        const addResponse1 = (question) => {
            testResponses.value.push({ role: 'agentName', content: question });
        };

        return { testResponses, addResponse1 };
    },
    data() {
        return {
            responsesZZ: [{ role: 'lucy', content: 'Hello! How can I help you?' }],
            agents: [],
            selectedAgent: "",
            accountName: "",
            question: "",
            requestedQuestion: "",
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
            messages: [],
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
        addResponse(question) {
            //this.responsesZZ = ref([{ role: 'ssss', content: 'ssssss can I help you?' }]),
            console.log(this.responsesZZ) // logs [{ role: 'lucy', content: 'Hello! How can I help you?' }]
            this.responsesZZ.push({ role: this.accountName, content: question });
            this.question = question;
            this.ask();
        },
        async ask() {
            this.isLoading = true;
            this.responsesZZ.push({ role: this.accountName, content: this.question });
            this.messages = [this.question, ...this.messages];
            //this.messages.push(this.question);
            //this.messages[0] = this.question;   
            this.requestedQuestion = this.question;
            this.question = "";
            try {
                const response = await this.dataService.askQuestion(
                    this.requestedQuestion,
                    this.selectedAgent.name,
                    this.accountName,
                    this.conversationId,
                    this.selectType
                );
                this.answer = response.response;
                this.responsesZZ.push({ role: this.selectedAgent.name, content: this.answer });
                //this.messages = ["aa", "bb", "cc","dd", "ee", "ff" ];  <--- this works push does not
                //this.messages = [this.answer, ...this.messages];
                //this.messages.push(this.answer);

            } catch (error) {
                this.answer = "Error occurred while processing the question.";
                this.messages.push(this.answer);
            }
            this.isLoading = false;
        },
        getCurrentDateYYYYMMDD() {
            const date = new Date();
            const year = date.getFullYear();
            const month = ('0' + (date.getMonth() + 1)).slice(-2);
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
  