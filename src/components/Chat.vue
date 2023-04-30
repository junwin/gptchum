<template>
    <div style="width: 100%; height: 100%">
        <h1>AI Assistant</h1>
        <Toolbar style="width: 100%">
            <template #start>
                <div>
                    <label for="agentDropdown">Agent Name:</label>
                    <Dropdown id="agentDropdown" v-model="selectedAgent" :options="agents" optionLabel="name" />
                </div>
                <div>
                    <label for="accountName">Account Name:</label>
                    <input type="text" id="accountName" v-model="accountName" />
                </div>
                <div>
                    <label for="selectType">Account Name:</label>
                    <input type="text" id="selectType" v-model="selectType" />
                </div>
            </template>
        </Toolbar>

        <div>
            <Textarea id="question" v-model="question" :rows="5" :spellcheck="spellcheck" :lang="language" class="w-full" />
        </div>
        <div>
            <Textarea id="answer" v-model="answer" :rows="10" :spellcheck="spellcheck" :lang="language" class="w-full" />
            <Slider v-model="rate" class="w-full" />
        </div>
        <div>

            <Toolbar style="width: 100%">
                <template #start>
                    <Button :label="recordButtonLabel" @click="toggleRecording" :disabled="isVoiceDisabled" />
                    <Button :label="speaking ? 'Stop Speaking' : 'Speak'" @click="toggleSpeaking"
                        :disabled="isVoiceDisabled" />
                    <Button label="Ask" @click="ask" :disabled="isLoading" />
                    <Dropdown v-model="selectedVoice" :options="voices" optionLabel="name" />
                </template>
            </Toolbar>
        </div>
    </div>
</template>

  
  
  
<script>
import DataService from "../DataService";
import { useSettingStore } from "../stores/SettingStore.js";

export default {
    components: {},
    name: "Chat",
    data() {
        return {
            agents: [],
            selectedAgent: "",
            //agentName: "",
            accountName: "",
            question: "",
            answer: "",
            recordButtonLabel: 'Start Recording',
            selectedVoice: null,
            voices: [],
            voicesAll: [],
            rate: 50,
            isLoading: false,
            speaking: false,
            conversationId: "none",
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
        this.populateVoiceList();
        this.fetchAgentNames();
        this.conversationId = Date.now().toString();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = this.populateVoiceList;
        }
    },
    watch: {
        selectedAgent(newAgentName) {
            //this.store = useSettingStore();
            this.store.agentName = newAgentName;
            //this.selectedAgent = newAgentName;
        },
        accountName(newAccountName) {
            //this.store = useSettingStore();
            this.store.accountName = newAccountName;
            //this.store.setAccountName(newAccountName);
            //this.accountName = newAccountName;
        },
    },
    computed: {
        isVoiceDisabled() {
            return this.isLoading || !this.selectedVoice;
        },
    },
    methods: {
        populateVoiceList() {
            const synth = window.speechSynthesis;
            this.voicesAll = synth.getVoices();

            this.voices = this.voicesAll
                .filter(voice => {
                    return (
                        voice.lang.includes("US") ||
                        voice.lang.includes("GB") ||
                        voice.lang.includes("MX") ||
                        voice.lang.includes("DE")
                    );
                })
                .map(voice => {
                    return { name: `${voice.name} (${voice.lang})`, code: voice.name };
                });
        },
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
        async fetchAgentNames() {
            try {
                const agentNames = await this.dataService.getAgentNames();
                this.agents = agentNames.map(agentName => ({ name: agentName }));
            } catch (error) {
                console.error("Error fetching agent names:", error);
            }
        },
        toggleRecording() {
            if (this.isRecording) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
            this.isRecording = !this.isRecording;
            this.recordButtonLabel = this.isRecording ? 'Stop Recording' : 'Start Recording';
        },
        toggleSpeaking() {
            if (this.speaking) {
                this.stopNativeSpeak();
            } else {
                this.nativeSpeak();
            }
            this.speaking = !this.speaking;
        },
        startRecording() {
            if (window.SpeechRecognition || window.webkitSpeechRecognition) {
                this.startNativeRecording();
            } else {
                DataService.startApiRecording()
                    .then((transcription) => {
                        this.question = transcription;
                    })
                    .catch((error) => {
                        console.error("Error in speech recognition:", error);
                    });
            }
        },
        stopRecording() {
            if (this.recognition) {
                this.stopNativeRecording();
            } else {
                DataService.stopApiRecording();
            }
        },
        speak() {
            if (window.speechSynthesis) {
                this.nativeSpeak();
            } else {
                DataService.apiSpeak(this.answer);
            }
        },
        // Native Web Speech API methods
        startNativeRecording() {
            // Set up the SpeechRecognition object
            const SpeechRecognition =
                window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            const selectedVoice = this.voicesAll.find((v) => v.name === this.selectedVoice.code);
            recognition.lang = selectedVoice.lang;
            recognition.interimResults = false;
            recognition.continuous = true; // Keep listening until stopped manually

            recognition.start();

            // Set up the event listeners
            recognition.addEventListener("result", (event) => {
                this.question = event.results[0][0].transcript;
            });

            recognition.addEventListener("error", (event) => {
                console.error("Error in speech recognition:", event.error);
            });

            // Save the recognition object to the Vue instance
            this.recognition = recognition;
        },

        stopNativeRecording() {
            this.recognition.stop();
        },
        nativeSpeak() {
            const synth = window.speechSynthesis;
            //const voicesAll = synth.getVoices();
            const selectedVoice = this.voicesAll.find((v) => v.name === this.selectedVoice.code);

            if (selectedVoice) {
                const utterance = new SpeechSynthesisUtterance(this.answer);
                utterance.voice = selectedVoice;
                utterance.rate = this.rate / 50;
                synth.speak(utterance);
            } else {
                // No voice matching the selected language and gender was found.
                // You can handle this case as you see fit.
            }
        },
        stopNativeSpeak() {
            const synth = window.speechSynthesis;
            synth.cancel();
        },

    },
};
</script>
  