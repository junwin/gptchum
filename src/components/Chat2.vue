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

      <!-- Preferences button -->
      <div class="p-mr-2">
        <Button
          icon="pi pi-cog"
          class="p-button-rounded p-button-text"
          @click="openPrefs"
          :title="'Lucy Endpoint: ' + (store?.serviceBaseUrl || 'not set')"
        />
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

    <!-- Preferences Dialog -->
    <Dialog
      v-model:visible="showPrefs"
      header="Preferences"
      :modal="true"
      :closable="true"
      :style="{ width: '450px' }"
    >
      <div class="prefs-form">
        <div class="field">
          <label for="prefEndpoint">Lucy Endpoint URL</label>
          <InputText
            id="prefEndpoint"
            v-model="prefEndpoint"
            class="w-full"
            placeholder="http://localhost:5000"
          />
        </div>
        <div class="field">
          <label for="prefApiKey">API Key</label>
          <InputText
            id="prefApiKey"
            v-model="prefApiKey"
            type="password"
            class="w-full"
            placeholder="Optional API key"
          />
        </div>
        <div class="field">
          <label for="prefAccount">Account Name</label>
          <InputText
            id="prefAccount"
            v-model="prefAccount"
            class="w-full"
            placeholder="e.g. junwin"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" @click="showPrefs = false" class="p-button-text" />
        <Button label="Save" @click="savePrefs" />
      </template>
    </Dialog>

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

.prefs-form .field {
  margin-bottom: 1rem;
}

.prefs-form label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.w-full {
  width: 100%;
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
      contextName: "",
      contextOptions: [],

      // API key (optional, per-request override)
      apiKey: "",

      isLoading: false,

      sessions: [],
      selectedSession: null,

      selectType: "",
      dataService: null,
      store: null,

      isLoadingChat: false,

      // simple debounce for accountName -> refreshContextOptions
      _contextRefreshTimer: null,

      // Preferences dialog
      showPrefs: false,
      prefEndpoint: "",
      prefApiKey: "",
      prefAccount: "",
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
      if (this.store) this.store.contextName = newName;
    },
  },

  methods: {
    toggleTheme() {
      this.store?.toggleTheme?.();
    },

    // --- Preferences ---
    openPrefs() {
      this.prefEndpoint = this.store?.serviceBaseUrl || "http://localhost:5000";
      this.prefApiKey = this.store?.apiKey || "";
      this.prefAccount = this.store?.accountName || "";
      this.showPrefs = true;
    },

    savePrefs() {
      // Save endpoint URL (recreates DataService)
      if (this.store) {
        this.store.setServiceBaseUrl(this.prefEndpoint);
        this.store.setApiKey(this.prefApiKey);
        this.store.setAccountName(this.prefAccount);
      }

      // Update local references
      this.dataService = this.store?.dataService;
      this.accountName = this.prefAccount;
      this.apiKey = this.prefApiKey;

      // Refresh agents and sessions with new endpoint
      this.fetchAgentNames();
      if (this.canOperate) {
        this.refreshSessions();
      }

      this.showPrefs = false;
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

        if (!(this.contextName || "").trim() && this.contextOptions.length) {
          this.contextName = this.contextOptions[0];
        }
      } catch (error) {
        console.error("Error fetching context names:", error);
        this.contextOptions = [];
      }
    },

    onSessionChange(e) {
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

        const currentId = this.selectedSession?.id;
        const stillThere = currentId ? this.sessions.find(s => s.id === currentId) : null;

        this.selectedSession = stillThere || this.sessions[0];

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

        this.selectedSession = { id: session.id, friendly_name: friendlyName || session.id };

        await this.refreshSessions();
      } catch (error) {
        console.error("Error creating chat:", error);
      }
    },

    async handleNewMessage(message) {
      const text = (message?.content || "").trim();
      if (!text) return;

      await this.$nextTick();
      while (this.isLoadingChat) {
        await new Promise(resolve => setTimeout(resolve, 25));
      }

      let sessionId = this.selectedSession?.id;

      if (!sessionId) {
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

      // Add user message card
      this.responses.push({ id: `u_${Date.now()}`, role: this.accountName, kind: "text", content: text });

      // Add placeholder assistant card
      const assistantCard = {
        id: `a_${Date.now()}`,
        role: this.selectedAgent.name,
        kind: "text",
        content: "",
        isStreaming: true,
      };
      this.responses.push(assistantCard);

      const contextName = (this.contextName || "").trim() || null;

      try {
        this.isLoading = true;

        const stream = this.dataService.askQuestionStreaming(
          text,
          this.selectedAgent.name,
          this.accountName,
          sessionId,
          contextName,
        );

        for await (const event of stream) {
          switch (event.type) {
            case "tool_call":
              this.responses.push({
                id: `tc_${event.call_id || Date.now()}`,
                role: "tool",
                kind: "tool",
                content: `Calling ${event.tool_name}...`,
                call_id: event.call_id,
                tool_name: event.tool_name,
                ok: null,
              });
              break;

            case "tool_result":
              const toolCard = this.responses.find(
                m => m.kind === "tool" && m.call_id === event.call_id
              );
              if (toolCard) {
                toolCard.ok = event.ok;
                toolCard.content = event.ok ? "Done" : "Failed";
              }
              break;

            case "text":
              if (assistantCard.message_id === event.message_id) {
                // Update in-place (future word streaming)
                assistantCard.content += event.content;
              } else {
                assistantCard.content = event.content;
                assistantCard.message_id = event.message_id;
              }
              break;

            case "image":
              this.responses.push({
                id: `img_${Date.now()}`,
                role: this.selectedAgent.name,
                kind: "image",
                image_url: event.image_url,
                alt: event.alt || "",
              });
              break;

            case "action":
              if (event.action === "reset_session") {
                this.selectedSession = null;
                this.responses = [];
                await this.refreshSessions();
              } else if (event.action === "redirect") {
                const targetId = event.action_payload?.target_session_id;
                if (targetId) {
                  await this.loadSession(targetId);
                  await this.refreshSessions();
                }
              }
              break;

            case "done":
              assistantCard.isStreaming = false;
              this.selectedSession = {
                ...this.selectedSession,
                id: event.conversation_id || this.selectedSession?.id,
              };
              break;

            case "error":
              assistantCard.isStreaming = false;
              assistantCard.content = event.message || "An error occurred";
              assistantCard.error = true;
              break;
          }

          // scroll handled by ChatWindow watch
        }

        // Refresh sessions after streaming completes
        setTimeout(async () => {
          await this.loadChat(sessionId);
          await this.refreshSessions();
        }, 150);
      } catch (err) {
        console.error("Streaming ask failed:", err);
        assistantCard.isStreaming = false;
        assistantCard.content = `Connection error: ${err.message}`;
        assistantCard.error = true;
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>
