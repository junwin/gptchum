<!-- /home/junwin/src/repos/gptchum/src/components/Chat2.vue -->
<template>
  <div class="app-container">
    <div class="toolbar-container">
      <div class="toolbar-icon">
        <Button icon="pi pi-bars" class="p-button-text"
          :aria-label="sidebarOpen ? 'Hide chats' : 'Show chats'"
          :aria-expanded="sidebarOpen" aria-controls="chat-sidebar"
          @click="sidebarOpen = !sidebarOpen" />
      </div>
      <!-- Agent -->
      <div class="toolbar-field agent-field">
        <Dropdown
          id="agentDropdown"
          v-model="selectedAgent"
          :options="agents"
          optionLabel="name"
          placeholder="Select agent"
        />
      </div>

      <!-- Context -->
      <div class="toolbar-field context-field">
        <Dropdown
          id="contextName"
          v-model="contextName"
          :options="contextOptions"
          editable
          placeholder="default"
          class="context-dropdown"
        />
      </div>
    </div>

    <!-- Preferences Dialog -->
    <Dialog
      v-model:visible="showPrefs"
      header="Preferences"
      :modal="true"
      :closable="true"
      :style="{ width: 'min(450px, calc(100vw - 2rem))' }"
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

    <div class="chat-layout">
      <aside v-show="sidebarOpen" id="chat-sidebar" class="chat-sidebar" aria-label="Chats">
        <div class="sidebar-heading">
          <h2>Chats</h2>
          <div class="sidebar-actions">
            <Button icon="pi pi-plus" class="p-button-text" aria-label="New chat"
              title="New chat" :disabled="!canOperate" @click="createNewChat" />
            <Button icon="pi pi-refresh" class="p-button-text" aria-label="Refresh chats"
              title="Refresh chats" :disabled="!canOperate || isLoading" @click="refreshSessions" />
          </div>
        </div>
        <div v-if="!sessions.length" class="sidebar-empty">No chats yet</div>
        <div v-else class="session-list">
          <button v-for="session in sessions" :key="session.id" type="button"
            class="session-item" :class="{ active: selectedSession?.id === session.id }"
            :aria-current="selectedSession?.id === session.id ? 'true' : undefined"
            @click="selectSession(session)">
            <span class="session-name">{{ session.friendly_name || session.id || '(unnamed)' }}</span>
            <span class="session-meta">
              <span v-if="session.message_count != null">{{ session.message_count }} msgs</span>
              <span v-if="session.updated_at"> · {{ formatUpdated(session.updated_at) }}</span>
            </span>
          </button>
        </div>
        <div class="sidebar-footer">
          <Button icon="pi pi-cog" class="p-button-text" aria-label="Preferences"
            :title="'Lucy Endpoint: ' + (store?.serviceBaseUrl || 'not set')"
            @click="openPrefs" />
          <Button class="p-button-text" :icon="isDarkMode ? 'pi pi-sun' : 'pi pi-moon'"
            :aria-label="isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'"
            :title="isDarkMode ? 'Light mode' : 'Dark mode'" @click="toggleTheme" />
        </div>
      </aside>
      <div class="chat-content">
        <ChatWindow
          :assistantName="selectedAgent?.name || 'assistant'"
          :userName="accountName || 'user'"
          :conversationId="selectedSession?.id || null"
          :currentMessages="responses"
          :contextName="(contextName || '').trim() || null"
          :isSending="isSending"
          @new-message="handleNewMessage"
          @download-image="downloadImage"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem;
  background-color: var(--surface-card, #f5f5f5);
  border: 1px solid var(--surface-border, #d3d3d3);
}

.toolbar-field {
  min-width: 0;
}

.agent-field {
  flex: 0 1 11rem;
}

.context-field {
  flex: 0 1 16rem;
}

.toolbar-field :deep(.p-dropdown) {
  width: 100%;
  min-width: 0;
  height: 2.75rem;
}

.toolbar-field :deep(.p-dropdown-label) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-icon :deep(.p-button) {
  width: 2.75rem;
  height: 2.75rem;
}

.chat-layout {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.chat-sidebar {
  display: flex;
  flex-direction: column;
  flex: 0 0 16rem;
  min-width: 0;
  min-height: 0;
  border-right: 1px solid var(--surface-border, #d3d3d3);
  background: var(--surface-card, #f5f5f5);
}

.sidebar-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
}

.sidebar-heading h2 {
  font-size: 1rem;
  margin: 0;
}

.sidebar-actions {
  display: flex;
  align-items: center;
}

.sidebar-empty {
  flex: 1;
  padding: 0.75rem;
  opacity: 0.7;
}

.session-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.25rem;
  min-height: 0;
  overflow-y: auto;
  padding: 0 0.5rem 0.5rem;
}

.sidebar-footer {
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem;
  border-top: 1px solid var(--surface-border, #d3d3d3);
}

.session-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  min-width: 0;
  padding: 0.6rem;
  border: 0;
  border-radius: 0.375rem;
  color: var(--text-color, inherit);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.session-item:hover,
.session-item:focus-visible {
  background: var(--surface-hover, #e8e8e8);
}

.session-item.active {
  background: var(--highlight-bg, #dbeafe);
  color: var(--highlight-text-color, inherit);
}

.chat-content {
  flex: 1;
  min-width: 0;
}

@media (max-width: 600px) {
  .chat-sidebar {
    position: absolute;
    inset: 0 auto 0 0;
    z-index: 2;
    width: min(18rem, calc(100vw - 3rem));
    box-shadow: 0.25rem 0 0.75rem rgba(0, 0, 0, 0.15);
  }

  .toolbar-field {
    flex: 1 1 100%;
  }
}

.session-name {
  font-weight: 600;
  max-width: 100%;
  overflow-wrap: anywhere;
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
import { imageCard, addImageCard } from "../imageCards.js";
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
      isSending: false,

      sessions: [],
      selectedSession: null,
      sidebarOpen: true,

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

  beforeUnmount() {
    this._releaseMediaUrls();
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
      this.store.setAgentName(newAgent.name);
    },

    accountName(newName) {
      this.store.setAccountName(newName);

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
      if (this.store) this.store.setContextName(newName);
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
      // Both setters keep DataService in sync with the saved connection settings.
      if (this.store) {
        this.store.setApiKey(this.prefApiKey);
        this.store.setServiceBaseUrl(this.prefEndpoint);
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

    selectSession(session) {
      if (!session?.id || session.id === this.selectedSession?.id) return;
      this.selectedSession = session;
      if (this.store) this.store.setChatSessionId(session.id);
      this.loadChat(session.id);
      if (window.matchMedia("(max-width: 600px)").matches) this.sidebarOpen = false;
    },

    formatUpdated(iso) {
      try {
        return new Date(iso).toLocaleString();
      } catch {
        return iso;
      }
    },

    async refreshSessions({ loadMessages = true } = {}) {
      try {
        this.isLoading = true;

        const list = await this.dataService.listChats(this.accountName, 50);
        this.sessions = list || [];

        if (this.sessions.length === 0) {
          this.selectedSession = null;
          this.responses = [{ id: "hello", role: this.selectedAgent.name, content: "Hello! How can I help you?" }];
          return;
        }

        // Prefer: current in-memory session, then persisted session, then first
        const currentId = this.selectedSession?.id || this.store?.getChatSessionId;
        const stillThere = currentId ? this.sessions.find(s => s.id === currentId) : null;

        this.selectedSession = stillThere || this.sessions[0];

        if (this.selectedSession?.id) {
          if (this.store) this.store.setChatSessionId(this.selectedSession.id);
          if (loadMessages) await this.loadChat(this.selectedSession.id);
        }
      } catch (error) {
        console.error("Error refreshing sessions:", error);
      } finally {
        this.isLoading = false;
      }
    },

    _parseContent(content) {
      // Try to parse content as JSON for structured payloads (images, etc).
      // Returns the parsed object on success, or the raw string on failure.
      if (typeof content !== "string") return content;
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    },

    // ------------------------------------------------------------------
    // Message → card mapping (for chat display only — tool events are separate)
    // ------------------------------------------------------------------
    _mapMessageToCard(m, idx) {
      const kind = m.kind || (m.role === "assistant" ? "assistant_message" : m.role === "user" ? "user_message" : m.role);
      const parsed = this._parseContent(m.content);

      switch (kind) {
        case "user_message":
          return {
            id: m.utc_timestamp || `u_${idx}`,
            role: this.accountName,
            kind: "text",
            content: typeof parsed === "string" ? parsed : JSON.stringify(parsed),
          };

        case "assistant_message":
          return {
            id: m.utc_timestamp || `a_${idx}`,
            role: this.selectedAgent?.name || "assistant",
            kind: "text",
            content: typeof parsed === "string" ? parsed : JSON.stringify(parsed),
          };

        case "generated_image": {
          const fmt = parsed?.format || "png";
          if (fmt === "svg") {
            const svgMarkup = parsed?.svg_markup || "";
            const encoded = encodeURIComponent(svgMarkup);
            return {
              id: m.utc_timestamp || `img_${idx}`,
              role: this.selectedAgent?.name || "assistant",
              kind: "image",
              image_url: `data:image/svg+xml,${encoded}`,
              alt: parsed?.alt || "",
              format: "svg",
              width: parsed?.width,
              height: parsed?.height,
            };
          }
          return imageCard(parsed || {}, {
            id: m.event_id || m.utc_timestamp || `img_${idx}`,
            role: this.selectedAgent?.name || "assistant",
          });
        }

        case "generated_video":
          return {
            id: m.utc_timestamp || `vid_${idx}`,
            role: this.selectedAgent?.name || "assistant",
            kind: "video",
            remote_url: parsed?.video_url || parsed?.url || "",
            mime_type: parsed?.mime_type || "video/mp4",
            download_name: parsed?.download_name || "fashion-reel.mp4",
            video_id: parsed?.video_id,
            video_url: null,
            loading: true,
          };

        case "assistant_tool_call":
        case "tool_result":
          return null;

        case "summary":
        case "system_note":
          return {
            id: m.utc_timestamp || `sys_${idx}`,
            role: "system",
            kind: "system_note",
            noteKind: kind,
            content: typeof parsed === "string" ? parsed : JSON.stringify(parsed),
          };

        default:
          return {
            id: m.utc_timestamp || `msg_${idx}`,
            role: m.role === "assistant" ? (this.selectedAgent?.name || "assistant") : this.accountName,
            kind: "text",
            content: typeof parsed === "string" ? parsed : JSON.stringify(parsed),
          };
      }
    },

    // ------------------------------------------------------------------
    // Tool chips builder (for history loading — returns chip cards to insert)
    // ------------------------------------------------------------------
    _buildToolChipCards(messages) {
      const chipCards = [];
      let pendingChips = [];
      let lastAssistantIdx = -1;

      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        const kind = m.kind || (m.role === "assistant" ? "assistant_message" : "user_message");

        if (kind === "assistant_tool_call") {
          const parsed = this._parseContent(m.content);
          const ts = m.utc_timestamp ? new Date(m.utc_timestamp).getTime() : Date.now();
          pendingChips.push({
            call_id: (parsed && parsed.call_id) || `hist_${pendingChips.length}`,
            tool_name: (parsed && parsed.tool_name) || "unknown",
            status: "running",
            startTime: ts,
          });
        } else if (kind === "tool_result") {
          const parsed = this._parseContent(m.content);
          if (!parsed || !parsed.call_id) continue;

          const chip = pendingChips.find(c => c.call_id === parsed.call_id);
          if (chip) {
            if (parsed.status && ["success", "warning", "error"].includes(parsed.status)) {
              chip.status = parsed.status;
            } else {
              chip.status = parsed.ok ? "success" : "error";
            }
            chip.summary = chip.status === "success" ? "Done"
              : chip.status === "warning" ? "Non-zero exit"
              : "Failed";
            if (chip.startTime && m.utc_timestamp) {
              chip.duration_ms = new Date(m.utc_timestamp).getTime() - chip.startTime;
            }
          }
        } else if (kind === "assistant_message") {
          // Flush pending chips before this assistant message
          if (pendingChips.length > 0) {
            chipCards.push({
              insertAfterMsgIdx: lastAssistantIdx >= 0 ? lastAssistantIdx : i - 1,
              card: {
                id: `tools_hist_${i}`,
                kind: "tool_chips",
                chips: [...pendingChips],
              },
            });
            pendingChips = [];
          }
        }

        if (kind === "assistant_message" || kind === "user_message") {
          lastAssistantIdx = i;
        }
      }

      // Flush any remaining chips at the end
      if (pendingChips.length > 0) {
        chipCards.push({
          insertAfterMsgIdx: lastAssistantIdx,
          card: {
            id: `tools_hist_end`,
            kind: "tool_chips",
            chips: [...pendingChips],
          },
        });
      }

      return chipCards;
    },

    // ------------------------------------------------------------------
    // Chat loading
    // ------------------------------------------------------------------
    async loadChat(sessionId) {
      try {
        if (!sessionId) return;
        this.isLoadingChat = true;

        const chat = await this.dataService.getChat(sessionId);
        const messages = chat.messages || [];

        // Map messages to display cards (tool events → null, filtered out)
        const msgCards = messages
          .map((m, idx) => this._mapMessageToCard(m, idx))
          .filter(Boolean);

        // Build tool chip cards and insert them inline
        const toolChipCards = this._buildToolChipCards(messages);

        // Insert chip cards after their associated user message (working backwards so indices stay valid)
        const sorted = [...toolChipCards].sort((a, b) => b.insertAfterMsgIdx - a.insertAfterMsgIdx);
        for (const { insertAfterMsgIdx, card } of sorted) {
          // insertAfterMsgIdx is an index in the original messages array.
          // We need to find the corresponding card in msgCards.
          // Count how many non-null cards we have up to insertAfterMsgIdx.
          let cardCount = 0;
          let targetIdx = -1;
          for (let i = 0; i <= insertAfterMsgIdx && i < messages.length; i++) {
            const mapped = this._mapMessageToCard(messages[i], i);
            if (mapped !== null) {
              cardCount++;
              targetIdx = cardCount - 1;
            }
          }
          if (targetIdx >= 0 && targetIdx < msgCards.length) {
            msgCards.splice(targetIdx + 1, 0, card);
          } else {
            msgCards.push(card);
          }
        }

        this._releaseMediaUrls();
        this.responses = msgCards.length
          ? msgCards
          : [{ id: "hello", role: this.selectedAgent?.name || "assistant", content: "Hello! How can I help you?" }];
        await Promise.all([this._hydrateVideoCards(this.responses), this._hydrateImageCards(this.responses)]);
      } catch (error) {
        console.error("Error loading chat:", error);
      } finally {
        this.isLoadingChat = false;
      }
    },

    _makeChatName() {
      // Fallback name when user cancels prompt: e.g. "Chat Jul 31"
      const now = new Date();
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `Chat ${months[now.getMonth()]} ${now.getDate()}`;
    },

    async createNewChat() {
      try {
        if (!this.canOperate) return;

        const friendlyName = window.prompt("Chat name?", "tuesday") || this._makeChatName();
        const session = await this.dataService.createChat(
          this.selectedAgent.name,
          this.accountName,
          friendlyName,
          null
        );

        this.selectedSession = { id: session.id, friendly_name: friendlyName };

        await this.refreshSessions();
      } catch (error) {
        console.error("Error creating chat:", error);
      }
    },

    _isImage(file) {
      return file.type && file.type.startsWith("image/");
    },

    // ------------------------------------------------------------------
    // Insert or get the tool chip card for the current streaming round
    // ------------------------------------------------------------------
    _getOrCreateChipCard() {
      // Find the streaming assistant card
      const assistantIdx = this.responses.findIndex(m => m.isStreaming);
      if (assistantIdx < 0) return null;

      // Look for an existing tool_chips card right before the assistant
      if (assistantIdx > 0 && this.responses[assistantIdx - 1].kind === "tool_chips") {
        return this.responses[assistantIdx - 1];
      }

      // Create a new tool_chips card and insert before the assistant
      const card = {
        id: `tools_${Date.now()}`,
        kind: "tool_chips",
        chips: [],
      };
      this.responses.splice(assistantIdx, 0, card);
      return card;
    },

    _releaseMediaUrls(cards = this.responses) {
      for (const card of cards || []) {
        if (card?.kind === "video" && card.video_url?.startsWith("blob:")) {
          URL.revokeObjectURL(card.video_url);
        }
        if (card?.kind === "image" && card.image_url?.startsWith("blob:")) {
          URL.revokeObjectURL(card.image_url);
        }
      }
    },

    async _hydrateImageCard(card) {
      const remoteUrl = card.remote_url || card.image_url;
      if (!remoteUrl || !remoteUrl.includes("/download/image/")) return;
      card.remote_url = remoteUrl;
      card.image_url = null;
      card.loading = true;
      card.error = null;
      try {
        const blob = await this.dataService.downloadImage(remoteUrl);
        card.image_url = URL.createObjectURL(blob);
      } catch (error) {
        card.error = error.message || "Unable to download image";
      } finally {
        card.loading = false;
      }
    },

    async downloadImage(card) {
      card.error = null;
      let objectUrl;
      try {
        const url = card.download_url || card.remote_url;
        objectUrl = url
          ? URL.createObjectURL(await this.dataService.downloadImage(url))
          : card.image_url;
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = `generated-${card.image_id || "image"}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (error) {
        card.error = error.message || "Unable to download image";
      } finally {
        if (objectUrl?.startsWith("blob:") && objectUrl !== card.image_url) {
          setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        }
      }
    },

    async _hydrateImageCards(cards) {
      await Promise.all((cards || []).filter(card => card?.kind === "image")
        .map(card => this._hydrateImageCard(card)));
    },

    async _hydrateVideoCard(card) {
      if (!card?.remote_url) {
        card.loading = false;
        card.error = "Video download URL is missing";
        return;
      }
      try {
        const blob = await this.dataService.downloadVideo(card.remote_url);
        card.video_url = URL.createObjectURL(blob);
        card.loading = false;
      } catch (error) {
        console.error("Video download failed:", error);
        card.loading = false;
        card.error = error.message || "Unable to download video";
      }
    },

    async _hydrateVideoCards(cards) {
      await Promise.all(
        (cards || [])
          .filter(card => card?.kind === "video" && card.remote_url)
          .map(card => this._hydrateVideoCard(card))
      );
    },

    async handleNewMessage(message) {
      if (this.isSending) return;
      this.isSending = true;
      try {
        await this._sendMessage(message);
      } finally {
        this.isSending = false;
      }
    },

    async _sendMessage(message) {
      const text = (message?.content || "").trim();
      const files = message?.files || [];
      if (!text && !files.length) return;

      await this.$nextTick();
      while (this.isLoadingChat) {
        await new Promise(resolve => setTimeout(resolve, 25));
      }

      let sessionId = this.selectedSession?.id;

      if (!sessionId) {
        const friendlyName = window.prompt("Chat name?", "tuesday") || this._makeChatName();
        const session = await this.dataService.createChat(
          this.selectedAgent.name,
          this.accountName,
          friendlyName,
          null
        );
        sessionId = session.id;
        this.selectedSession = { id: sessionId, friendly_name: friendlyName };
        await this.refreshSessions();
      }

      // --- Process files: images get uploaded, text files get read ---
      const imageIds = [];
      let fileTexts = "";

      for (const file of files) {
        if (this._isImage(file)) {
          // --- Image upload ---
          const uploadCardId = `up_${Date.now()}_${imageIds.length}`;
          this.responses.push({
            id: uploadCardId,
            role: this.accountName,
            kind: "text",
            content: `Uploading ${file.name}...`,
          });

          try {
            const result = await this.dataService.uploadImage(file, this.accountName);
            imageIds.push(result.id);

            // Replace placeholder with image card
            const idx = this.responses.findIndex(m => m.id === uploadCardId);
            if (idx !== -1) {
              this.responses[idx] = {
                id: `img_${Date.now()}`,
                role: this.accountName,
                kind: "image",
                image_url: URL.createObjectURL(file),
                alt: file.name,
              };
            }
          } catch (err) {
            console.error("Image upload failed:", err);
            const idx = this.responses.findIndex(m => m.id === uploadCardId);
            if (idx !== -1) {
              this.responses[idx] = {
                id: `err_${Date.now()}`,
                role: this.accountName,
                kind: "text",
                content: `Failed to upload ${file.name}: ${err.message}`,
                error: true,
              };
            }
          }
        } else {
          // --- Text file: read content client-side ---
          try {
            const content = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => reject(reader.error);
              reader.readAsText(file);
            });

            if (fileTexts) fileTexts += "\n\n";
            fileTexts += `--- ${file.name} ---\n${content}`;

            this.responses.push({
              id: `file_${Date.now()}`,
              role: this.accountName,
              kind: "text",
              content: `📄 Uploaded **${file.name}**`,
            });
          } catch (err) {
            console.error("File read failed:", err);
            this.responses.push({
              id: `err_${Date.now()}`,
              role: this.accountName,
              kind: "text",
              content: `Failed to read ${file.name}: ${err.message}`,
              error: true,
            });
          }
        }
      }

      // Build the combined question text (file contents + user text)
      const questionText = [fileTexts, text].filter(Boolean).join("\n\n");

      // Add user text message
      if (questionText) {
        this.responses.push({
          id: `u_${Date.now()}`,
          role: this.accountName,
          kind: "text",
          content: text || `📄 Sent ${files.filter(f => !this._isImage(f)).length} file(s)`,
        });
      }

      // Add placeholder assistant card
      const assistantCardData = {
        id: `a_${Date.now()}`,
        role: this.selectedAgent.name,
        kind: "text",
        content: "",
        isStreaming: true,
      };
      this.responses.push(assistantCardData);
      const assistantCard = this.responses[this.responses.length - 1];

      const contextName = (this.contextName || "").trim() || null;

      try {
        this.isLoading = true;

        const stream = this.dataService.askQuestionStreaming(
          questionText,
          this.selectedAgent.name,
          this.accountName,
          sessionId,
          contextName,
          imageIds.length ? imageIds : null,
        );

        for await (const event of stream) {
          switch (event.type) {
            case "tool_call": {
              const chipCard = this._getOrCreateChipCard();
              if (chipCard) {
                chipCard.chips.push({
                  call_id: event.call_id || `tc_${Date.now()}`,
                  tool_name: event.tool_name || "unknown",
                  status: "running",
                  startTime: Date.now(),
                });
              }
              break;
            }

            case "tool_result": {
              // Find the chip in the tool_chips card
              const chipCard = this._getOrCreateChipCard();
              if (chipCard) {
                const chip = chipCard.chips.find(c => c.call_id === event.call_id);
                if (chip) {
                  if (event.status && ["success", "warning", "error"].includes(event.status)) {
                    chip.status = event.status;
                  } else {
                    chip.status = event.ok ? "success" : "error";
                  }
                  chip.duration_ms = chip.startTime ? Date.now() - chip.startTime : undefined;
                  chip.summary = chip.status === "success" ? "Done"
                    : chip.status === "warning" ? "Non-zero exit"
                    : "Failed";
                }
              }
              break;
            }

            case "text":
              // Lucy currently emits complete text, not deltas. Replays replace
              // the same card instead of appending duplicate text.
              assistantCard.content = event.content;
              assistantCard.message_id = event.message_id;
              break;

            case "image": {
              const fmt = event.format || "png";
              if (fmt === "svg") {
                const svgMarkup = event.svg_markup || "";
                const encoded = encodeURIComponent(svgMarkup);
                this.responses.push({
                  id: `img_${Date.now()}`,
                  role: this.selectedAgent.name,
                  kind: "image",
                  image_url: `data:image/svg+xml,${encoded}`,
                  alt: event.alt || "",
                  format: "svg",
                  width: event.width,
                  height: event.height,
                });
              } else {
                const added = addImageCard(this.responses, imageCard(event, {
                  id: `img_${Date.now()}`,
                  role: this.selectedAgent.name,
                }));
                if (added.created) await this._hydrateImageCard(added.card);
              }
              break;
            }

            case "video": {
              const card = {
                id: `vid_${Date.now()}`,
                role: this.selectedAgent.name,
                kind: "video",
                remote_url: event.video_url,
                mime_type: event.mime_type || "video/mp4",
                download_name: event.download_name || "fashion-reel.mp4",
                video_id: event.video_id,
                video_url: null,
                loading: true,
              };
              this.responses.push(card);
              await this._hydrateVideoCard(this.responses[this.responses.length - 1]);
              break;
            }

            case "action":
              if (event.action === "reset_session") {
                this.selectedSession = null;
                this.responses = [];
                await this.refreshSessions();
              } else if (event.action === "redirect") {
                const targetId = event.action_payload?.target_session_id;
                if (targetId) {
                  await this.loadChat(targetId);
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
        }

        // Keep delivered inline images on screen; refresh only session metadata.
        await this.refreshSessions({ loadMessages: false });
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
