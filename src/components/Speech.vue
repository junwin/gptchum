<template>
    <div>
        <Button :label="recordingState" @click="toggleRecording" :disabled="isVoiceDisabled" />
        <Button :label="speaking ? 'Stop Speaking' : 'Speak'" @click="toggleSpeaking" :disabled="isVoiceDisabled" />
        <Dropdown v-model="selectedVoice" :options="voices" optionLabel="name" />
        <div class="w-full">
            <Slider v-model="rate" class="w-full" :min="1" :max="100" :step="1" />
        </div>
    </div>
</template>
  
<script>
import axios from 'axios';
export default {
    name: "Speech",
    props: {
        voicesZ: Array,
        selectedVoiceZ: Object,
        isVoiceDisabled: Boolean,
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
            speaking: false,
            audioChunks: [],
            recordingState: 'start',
            mediaRecorder: null,
            recordingTimeoutId: null,
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
                this.mediaRecorder.stop();
                //this.stopApiRecording();
                this.isRecording = false;
                this.recordingState = 'start'
            }else{
                this.recordingState = 'starting';
                this.startApiRecording();
                this.isRecording = true;
            }
            this.$emit("update:isRecording", !this.isRecording);
        },
        toggleSpeaking() {
            if (this.speaking) {
                this.stopNativeSpeak();
                this.speaking = false;
                
            } else {
                this.nativeSpeak(this.textToSpeak, this.selectedVoice.code, this.rate);
                this.speaking = true;
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
        startNativeRecording2() {
            // Check if MediaRecorder is available
            if (!navigator.mediaDevices && !navigator.mediaDevices.getUserMedia) {
                console.log('MediaDevices API not available');
            } else {
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(stream => {
                        const mediaRecorder = new MediaRecorder(stream);



                        let audioChunks = [];

                        mediaRecorder.ondataavailable = event => {
                            audioChunks.push(event.data);
                        };

                        mediaRecorder.start();

                        // Stop recording after 3 seconds and save the data
                        this.recordingTimeoutId = setTimeout(() => {
                            mediaRecorder.stop();
                        }, 10000);

                        mediaRecorder.onstop = () => {
                            const audioBlob = new Blob(audioChunks);
                            const audioUrl = URL.createObjectURL(audioBlob);
                            const audio = new Audio(audioUrl);

                            // Now audio contains the recorded data that can be played
                            audio.play();
                        };
                    })
                    .catch(err => console.log('Error: ', err));
            };
        },
        stopNativeRecording() {
            if (this.recognition) {
                this.recognition.stop();
            }
        },
        stopApiRecording() {
            this.isRecording = false;
            this.mediaRecorder = null;
            this.recordingState = 'translate';
            if(this.recordingTimeoutId){
                clearTimeout(this.recordingTimeoutId);
            }
            if (this.audioChunks.length === 0) {
                this.recordingState = 'start';
                this.$emit("speechResult", "no sound recorded");
                return;
            }
            const audioBlob = new Blob(this.audioChunks, { 'type': 'audio/webm; codecs=opus' });
            const audioFile = new File([audioBlob], "recording.webm", { 'type': 'audio/webm; codecs=opus' });

            const formData = new FormData();
            formData.append('file', audioFile);
            formData.append('model', 'whisper-1');
            formData.append('language', 'es');

            axios
                .post('https://api.openai.com/v1/audio/transcriptions', formData, {
                    headers: {
                        'Content-Type': audioBlob.type,
                        'Authorization': '',
                        
                    },
                })
                .then(response => {
                    const transcription = response.data.text;
                    this.$emit("speechResult", transcription);
                    //console.log('Transcription:', transcription);
                })
                .catch(error => {
                    console.error('Error:', error);
                });
                this.recordingState = 'start';
        },

        startApiRecording() {
            // Check if MediaRecorder is available
            if (!navigator.mediaDevices && !navigator.mediaDevices.getUserMedia) {
                console.log('MediaDevices API not available');
            } else {
                const constraints = { audio: true, video: false };
                const options = {
                    audioBitsPerSecond: 128000,
                    mimeType: "audio/webm",
                };
                navigator.mediaDevices.getUserMedia(constraints)
                    .then(stream => {
                        this.mediaRecorder = new MediaRecorder(stream, options);
                        var myType = this.mediaRecorder.mimeType; // should return "audio/webm"
                        this.audioChunks = [];

                        this.mediaRecorder.ondataavailable = event => {
                            this.audioChunks.push(event.data);
                        };

                        this.mediaRecorder.onstop = () => {
                            this.stopApiRecording();
                            const audioBlob = new Blob(this.audioChunks);
                        };

                        this.mediaRecorder.start();
                        this.recordingState = 'talk';

                        // Stop recording after 10 seconds
                        this.recordingTimeoutId = setTimeout(() => {
                            if (this.mediaRecorder != null)
                                this.mediaRecorder.stop();
                            //this.stopApiRecording();
                        }, 10000);
                    })
                    .catch(err => console.log('Error: ', err));
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
  