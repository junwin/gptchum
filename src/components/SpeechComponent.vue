<template>
    <div>
        <button @click="startRecording">Start Recording</button>
        <button @click="stopRecording">Stop Recording</button>
        <button @click="speak">Speak</button>
        <div>
            <label>Language:</label>
            <select v-model="selectedLanguage">
                <option value="en-US">English (US)</option>
                <option value="es-ES">Spanish (ES)</option>
            </select>
        </div>
        <div>
            <label>Transcription:</label>
            <textarea v-model="transcription" rows="5" cols="30"></textarea>
        </div>
    </div>
</template>
  
<script>
export default {
    data() {
        return {
            selectedLanguage: "en-US",
            transcription: "",
        };
    },
    methods: {
        startRecording() {
            // Set up the SpeechRecognition object
            const SpeechRecognition =
                window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.lang = this.selectedLanguage;
            recognition.interimResults = false;

            recognition.start();

            // Set up the event listeners
            recognition.addEventListener("result", (event) => {
                this.transcription = event.results[0][0].transcript;
            });

            recognition.addEventListener("error", (event) => {
                console.error("Error in speech recognition:", event.error);
            });

            // Save the recognition object to the Vue instance
            this.recognition = recognition;
        },
        stopRecording() {
            this.recognition.stop();
        },
        speak() {
            const synth = window.speechSynthesis;
            const utterance = new SpeechSynthesisUtterance(this.transcription);
            utterance.lang = this.selectedLanguage;
            synth.speak(utterance);
        },
    },
};
</script>
  