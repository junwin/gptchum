
<template>
  <div class="card">
    <Chat></Chat>
  </div>

</template>

<script>
import Chat from "./components/Chat.vue";
import SpeechComponent from "./components/SpeechComponent.vue";


export default {
  components: {
    Chat,

  },
  data() {
    return {
      question: '',
      answer: '',
    };
  },
  methods: {

  },
};
</script>



