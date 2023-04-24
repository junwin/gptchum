<template>
    <div style="width: 100%; height: 100%">
        <h1>AI Assistant</h1>
        <div>
            <label for="agentName">Agent Name:</label>
            <input type="text" id="agentName" v-model="agentName" />
        </div>
        <div>
            <label for="accountName">Account Name:</label>
            <input type="text" id="accountName" v-model="accountName" />
        </div>
        <div>
            <Textarea id="question" v-model="question" :rows="5" />

        </div>
        <div>
            <Textarea id="answer" v-model="answer" readonly :rows="10" />
            <Slider v-model="rate" class="w-full" />
        </div>
        <div>
            <div>
                <label>Voices:</label>
                <Dropdown v-model="selectedVoice" :options="voices" optionLabel="name" />
            </div>
            <Button :label="recordButtonLabel" @click="toggleRecording" :disabled="isVoiceDisabled" />
            <Button :label="speaking ? 'Stop Speaking' : 'Speak'" @click="toggleSpeaking" :disabled="isVoiceDisabled" />
            <Button label="Ask" @click="ask" :disabled="isLoading" />
        </div>
    </div>
</template>
  
  
  
<script>
import DataService from "../DataService";

export default {
    components: {},
    name: "Chat",
    data() {
        return {
            agentName: "",
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
        };
    },
    mounted() {
        this.populateVoiceList();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = this.populateVoiceList;
        }
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
                const response = await DataService.askQuestion(
                    this.question,
                    this.agentName,
                    this.accountName
                );
                this.answer = response.response;
            } catch (error) {
                this.answer = "Error occurred while processing the question.";
            }
            this.isLoading = false;
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
  