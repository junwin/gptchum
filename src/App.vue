
<template>
  <div class="card">
    <Chat></Chat>
    <Prompts></Prompts>
  </div>

</template>

<script>
import Chat from "./components/Chat.vue";
import Prompts from "./components/Prompts.vue";
import SpeechComponent from "./components/SpeechComponent.vue";


export default {
  components: {
    Chat,
    Prompts,

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



