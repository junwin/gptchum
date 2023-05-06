<template>
    <div>
      <Button :label="recordButtonLabel" @click="toggleRecording" :disabled="isVoiceDisabled" />
      <Button :label="speaking ? 'Stop Speaking' : 'Speak'" @click="toggleSpeaking" :disabled="isVoiceDisabled" />
      <Dropdown v-model="selectedVoice" :options="voices" optionLabel="name" />
      <div class="w-full">
        <Slider v-model="rate" class="w-full" :min="1" :max="100" :step="1" />
      </div>
    </div>
  </template>
  
<script>
export default {
    name: "Speech",
    props: {
        voicesZ: Array,
        selectedVoiceZ: Object,
        isVoiceDisabled: Boolean,
        speaking: Boolean,
        textToSpeak: String,
        recordedText: {
            type: String,
            default: "",
        },
    },
    data() {
        return {
            recognition: null,
            voicesAll: [],
            voices: [],
            selectedVoice: null,
            rate: 50,
            isRecording: false,
        };
    },
    mounted() {
        this.populateVoiceList();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = this.populateVoiceList;
        }
     
    },
    methods: {
        toggleRecording() {
            if (this.isRecording) {
                this.stopNativeRecording();
                this.isRecording = false;
            } else {
                const selectedVoice = this.voicesAll.find(
                    (v) => v.name === this.selectedVoice.code
                );
                this.startNativeRecording(selectedVoice.lang);
                this.isRecording = true;
            }
            this.$emit("update:isRecording", !this.isRecording);
        },
        toggleSpeaking() {
            if (this.speaking) {
                this.stopNativeSpeak();
            } else {
                this.nativeSpeak(this.textToSpeak, this.selectedVoice.code, this.rate);
            }
            this.$emit("update:speaking", !this.speaking);
        },
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
                this.$emit("speechResult", event.results[0][0].transcript);
            });
            recognition.addEventListener("error", (event) => {
                console.error("Error in speech recognition:", event.error);
            });
            // Save the recognition object to the Vue instance
            this.recognition = recognition;
        },
        stopNativeRecording() {
            if (this.recognition) {
                this.recognition.stop();
            }
        },
        nativeSpeak(text, voiceCode, rate) {
            const synth = window.speechSynthesis;
            const selectedVoice = this.voicesAll.find((v) => v.name === voiceCode);

            if (selectedVoice) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.voice = selectedVoice;
                utterance.rate = rate / 50;
                synth.speak(utterance);
            }
        },
        stopNativeSpeak() {
            const synth = window.speechSynthesis;
            synth.cancel();
        },
    },
};
</script>
  