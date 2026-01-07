<!-- /home/junwin/src/repos/gptchum/src/components/Chat2.vue -->
<template>
  <div :class="['app-container', { 'dark-theme': isDarkMode }]">
    <div class="toolbar-container">
      <!-- Agent -->
      <div class="p-mr-2">
        <Dropdown
          id="agentDropdown"
          v-model="selectedAgent"
          :options="agents"
          optionLabel="name"
          placeholder="Select agent"
        />
      </div>

      <!-- Account -->
      <span class="p-float-label p-mr-2">
        <label for="accountName">Account Name:</label>
        <InputText type="text" id="accountName" v-model="accountName" />
      </span>

      <!-- Chat selector (OBJECT-based, stable via dataKey) -->
      <div class="p-mr-2">
        <Dropdown
          id="chatDropdown"
          v-model="selectedSession"
          :options="sessions"
          optionLabel="friendly_name"
          dataKey="id"
          placeholder="Select chat"
          class="chat-dropdown"
          @change="onSessionChange"
        >
          <!-- Selected value -->
          <template #value="slotProps">
            <span v-if="slotProps.value">
              {{ formatSessionLabel(slotProps.value) }}
            </span>
            <span v-else>Select chat</span>
          </template>

          <!-- Options -->
          <template #option="slotProps">
            <div class="session-option">
              <div class="session-name">{{ slotProps.option.friendly_name }}</div>
              <div class="session-meta">
                <span v-if="slotProps.option.message_count != null">
                  {{ slotProps.option.message_count }} msgs
                </span>
                <span v-if="slotProps.option.updated_at">
                  · {{ formatUpdated(slotProps.option.updated_at) }}
                </span>
              </div>
            </div>
          </template>
        </Dropdown>
      </div>

      <!-- Actions -->
      <div class="p-mr-2">
        <Button label="New Chat" @click="createNewChat" :disabled="!canOperate" />
      </div>

      <div class="p-mr-2">
        <Button label="Refresh" @click="refreshSessions" :disabled="!canOperate" />
      </div>
    </div>

    <!-- Chat window -->
    <div class="p-mr-2">
      <ChatWindow
        :assistantName="selectedAgent?.name || 'assistant'"
        :userName="accountName || 'user'"
        :conversationId="selectedSession?.id || null"
        :currentMessages="responses"
        @new-message="handleNewMessage"
      />
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

.chat-dropdown {
  min-width: 320px;
}

.session-option {
  display: flex;
  flex-direction: column;
}

.session-name {
  font-weight: 600;
}

.session-meta {
  font-size: 0.85em;
  opacity: 0.75;
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
import ChatWindow from "./ChatWindow.vue";
import { useSettingStore } from "../stores/SettingStore.js";

export default {
  components: { ChatWindow },
  name: "Chat2",

  data() {
    return {
      responses: [{ id: "hello", role: "assistant", content: "Hello! How can I help you?" }],
      agents: [],
      selectedAgent: null,
      accountName: "",
      isLoading: false,

      sessions: [],
      selectedSession: null, // ✅ bind Dropdown to OBJECT (stable via dataKey)

      selectType: "",
      dataService: null,
      store: null,

      isLoadingChat: false,
    };
  },

  computed: {
    canOperate() {
      return !!(this.dataService && this.accountName && this.selectedAgent?.name);
    },
    isDarkMode() {
      return false;
    },
  },

  async mounted() {
    this.store = useSettingStore();
    this.dataService = this.store.dataService;

    this.selectedAgent = this.store.getAgentName ? { name: this.store.getAgentName } : null;
    this.accountName = this.store.getAccountName || "";

    await this.fetchAgentNames();

    // normalize selectedAgent to one of the option refs
    if (this.selectedAgent?.name && this.agents.length) {
      const match = this.agents.find(a => a.name === this.selectedAgent.name);
      if (match) this.selectedAgent = match;
    } else if (!this.selectedAgent && this.agents.length) {
      this.selectedAgent = this.agents[0];
    }

    if (this.canOperate) {
      await this.refreshSessions();
    }
  },

  watch: {
    selectedAgent(newAgent) {
      if (!newAgent) return;
      this.store.agentName = newAgent.name;

      this.selectedSession = null;
      this.responses = [{ id: "hello", role: "assistant", content: "Hello! How can I help you?" }];

      if (this.canOperate) this.refreshSessions();
    },

    accountName(newName) {
      this.store.accountName = newName;

      this.selectedSession = null;
      this.responses = [{ id: "hello", role: "assistant", content: "Hello! How can I help you?" }];

      if (this.canOperate) this.refreshSessions();
    },
  },

  methods: {
    async fetchAgentNames() {
      try {
        const agentNames = await this.dataService.getAgentNames();
        this.agents = agentNames.map(name => ({ name }));
      } catch (error) {
        console.error("Error fetching agent names:", error);
      }
    },

    onSessionChange(e) {
      // PrimeVue gives you the *actual selected object* here.
      // This also avoids any “watcher got old value” weirdness.
      const s = e?.value;
      if (!s?.id) return;
      this.loadChat(s.id);
    },

    formatSessionLabel(session) {
      const name = session?.friendly_name || session?.id || "(unnamed)";
      const count = session?.message_count != null ? ` (${session.message_count})` : "";
      return `${name}${count}`;
    },

    formatUpdated(iso) {
      try {
        return new Date(iso).toLocaleString();
      } catch {
        return iso;
      }
    },

    async refreshSessions() {
      try {
        this.isLoading = true;

        const list = await this.dataService.listChats(this.accountName, this.selectedAgent.name, 50);
        this.sessions = list || [];

        if (this.sessions.length === 0) {
          this.selectedSession = null;
          this.responses = [{ id: "hello", role: this.selectedAgent.name, content: "Hello! How can I help you?" }];
          return;
        }

        // keep currently selected session by id (NOT by index / object identity)
        const currentId = this.selectedSession?.id;
        const stillThere = currentId ? this.sessions.find(s => s.id === currentId) : null;

        this.selectedSession = stillThere || this.sessions[0];

        // load selected
        await this.loadChat(this.selectedSession.id);
      } catch (error) {
        console.error("Error refreshing sessions:", error);
      } finally {
        this.isLoading = false;
      }
    },

    async loadChat(sessionId) {
      try {
        if (!sessionId) return;
        this.isLoadingChat = true;

        const chat = await this.dataService.getChat(sessionId);

        const msgs = (chat.messages || []).map((m, idx) => ({
          id: m.utc_timestamp || `${idx}`,
          role: m.role === "assistant" ? this.selectedAgent.name : this.accountName,
          content: m.content,
        }));

        this.responses = msgs.length
          ? msgs
          : [{ id: "hello", role: this.selectedAgent.name, content: "Hello! How can I help you?" }];
      } catch (error) {
        console.error("Error loading chat:", error);
      } finally {
        this.isLoadingChat = false;
      }
    },

    async createNewChat() {
      try {
        if (!this.canOperate) return;

        const friendlyName = window.prompt("Chat name?", "tuesday");
        const session = await this.dataService.createChat(
          this.selectedAgent.name,
          this.accountName,
          friendlyName || null,
          null
        );

        // select it as an object (best effort until refresh pulls full session objects)
        this.selectedSession = { id: session.id, friendly_name: friendlyName || session.id };

        await this.refreshSessions();
      } catch (error) {
        console.error("Error creating chat:", error);
      }
    },

    async handleNewMessage(message) {
      const text = (message?.content || "").trim();
      if (!text) return;

      // wait for selection + any chat load to settle
      await this.$nextTick();
      while (this.isLoadingChat) {
        await new Promise(resolve => setTimeout(resolve, 25));
      }

      let sessionId = this.selectedSession?.id;

      if (!sessionId) {
        // auto-create chat if none selected
        const friendlyName = window.prompt("Chat name?", "tuesday");
        const session = await this.dataService.createChat(
          this.selectedAgent.name,
          this.accountName,
          friendlyName || null,
          null
        );
        sessionId = session.id;
        this.selectedSession = { id: sessionId, friendly_name: friendlyName || sessionId };
        await this.refreshSessions();
      }

      // optimistic UI
      this.responses.push({ id: `u_${Date.now()}`, role: this.accountName, content: text });

      try {
        this.isLoading = true;

        const result = await this.dataService.askQuestionMultiAgent(
          text,
          this.selectedAgent.name,
          this.accountName,
          sessionId,
          this.selectType
        );

        this.responses.push({
          id: `a_${Date.now()}`,
          role: this.selectedAgent.name,
          content: result?.response ?? "",
        });

        // reconcile from server
        setTimeout(async () => {
          await this.loadChat(sessionId);
          await this.refreshSessions();
        }, 150);
      } catch (error) {
        console.error("Ask failed:", error);
        this.responses.push({
          id: `e_${Date.now()}`,
          role: this.selectedAgent.name,
          content: "Error occurred while processing the question.",
        });
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>
