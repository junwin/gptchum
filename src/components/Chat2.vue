<!-- /home/junwin/src/repos/gptchum/src/components/Chat2.vue -->
<template>
  <div class="app-container">
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

      <!-- Context -->
      <div class="p-mr-2">
        <Dropdown
          id="contextName"
          v-model="contextName"
          :options="contextOptions"
          editable
          placeholder="default"
          class="context-dropdown"
        />
      </div>

      <!-- API Key -->
      <div class="p-mr-2">
        <InputText
          type="password"
          id="apiKey"
          v-model="apiKey"
          placeholder="API Key (optional)"
          class="api-key-input"
          @blur="onApiKeyBlur"
        />
      </div>

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

      <!-- Theme toggle (icon button) -->
      <div class="p-ml-auto">
        <Button
          class="p-button-text"
          :icon="isDarkMode ? 'pi pi-sun' : 'pi pi-moon'"
          :aria-label="isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'"
          :title="isDarkMode ? 'Light mode' : 'Dark mode'"
          @click="toggleTheme"
        />
      </div>
    </div>

    <!-- Chat window -->
    <div class="p-mr-2">
      <ChatWindow
        :assistantName="selectedAgent?.name || 'assistant'"
        :userName="accountName || 'user'"
        :conversationId="selectedSession?.id || null"
        :currentMessages="responses"
        :contextName="(contextName || '').trim() || null"
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

.context-dropdown {
  min-width: 220px;
}

.api-key-input {
  min-width: 200px;
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

      // Context
      // - contextName is user-entered state; it is passed through to DataService
      // - contextOptions is loaded per-account via dataService.getContextNames(accountName)
      contextName: "",
      contextOptions: [],

      // API key (optional, per-request override)
      apiKey: "",

      isLoading: false,

      sessions: [],
      selectedSession: null, // ✅ bind Dropdown to OBJECT (stable via dataKey)

      selectType: "",
      dataService: null,
      store: null,

      isLoadingChat: false,

      // simple debounce for accountName -> refreshContextOptions
      _contextRefreshTimer: null,
    };
  },

  computed: {
    canOperate() {
      return !!(this.dataService && this.accountName && this.selectedAgent?.name);
    },
    isDarkMode() {
      return this.store?.theme === "dark";
    },
  },

  async mounted() {
    this.store = useSettingStore();
    this.dataService = this.store.dataService;

    this.selectedAgent = this.store.getAgentName ? { name: this.store.getAgentName } : null;
    this.accountName = this.store.getAccountName || "";

    // load persisted context if present
    // (do not require store support; keep local state stable)
    this.contextName = this.store.getContextName || "";

    // load persisted API key if present
    this.apiKey = this.store.getApiKey || "";

    await this.fetchAgentNames();

    // normalize selectedAgent to one of the option refs
    if (this.selectedAgent?.name && this.agents.length) {
      const match = this.agents.find(a => a.name === this.selectedAgent.name);
      if (match) this.selectedAgent = match;
    } else if (!this.selectedAgent && this.agents.length) {
      this.selectedAgent = this.agents[0];
    }

    // best-effort: populate context dropdown if we already have an account
    if ((this.accountName || "").trim()) {
      await this.refreshContextOptions(this.accountName);
    }

    if (this.canOperate) {
      await this.refreshSessions();
    }
  },

  watch: {
    selectedAgent(newAgent) {
      if (!newAgent) return;
      this.store.agentName = newAgent.name;

      // Don't reset session or refresh sessions — the chat list is now
      // account-wide, not agent-specific. The user can keep their current
      // conversation and just switch which agent responds.
    },

    accountName(newName) {
      this.store.accountName = newName;

      this.selectedSession = null;
      this.responses = [{ id: "hello", role: "assistant", content: "Hello! How can I help you?" }];

      // debounce to avoid hammering API while typing
      if (this._contextRefreshTimer) clearTimeout(this._contextRefreshTimer);
      this._contextRefreshTimer = setTimeout(() => {
        this.refreshContextOptions(newName);
      }, 250);

      if (this.canOperate) this.refreshSessions();
    },

    contextName(newName) {
      // keep store in sync if it supports it
      if (this.store) this.store.contextName = newName;
    },
  },

  methods: {
    toggleTheme() {
      this.store?.toggleTheme?.();
    },

    onApiKeyBlur() {
      // Persist API key to store when user leaves the field
      if (this.store) {
        this.store.setApiKey(this.apiKey);
      }
    },

    async fetchAgentNames() {
      try {
        const agentNames = await this.dataService.getAgentNames();
        this.agents = agentNames.map(name => ({ name }));
      } catch (error) {
        console.error("Error fetching agent names:", error);
      }
    },

    async refreshContextOptions(accountName) {
      try {
        const acct = (accountName ?? this.accountName ?? "").trim();
        if (!acct) {
          this.contextOptions = [];
          return;
        }

        const names = await this.dataService.getContextNames(acct);
        this.contextOptions = (names || []).filter(Boolean);

        // If user already typed something, keep it even if it's not in list.
        // If nothing selected yet, default to first option.
        if (!(this.contextName || "").trim() && this.contextOptions.length) {
          this.contextName = this.contextOptions[0];
        }
      } catch (error) {
        // Don't block chat if contexts fail to load.
        console.error("Error fetching context names:", error);
        this.contextOptions = [];
      }
    },

    onSessionChange(e) {
      // PrimeVue gives you the *actual selected object* here.
      // This also avoids any "watcher got old value" weirdness.
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

        const list = await this.dataService.listChats(this.accountName, 50);
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

        const contextName = (this.contextName || "").trim() || null;
        const apiKey = (this.apiKey || "").trim() || null;

        const result = await this.dataService.askQuestionMultiAgent(
          text,
          this.selectedAgent.name,
          this.accountName,
          sessionId,
          this.selectType,
          null,
          contextName,
          apiKey
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
