<template>
    <div style="width: 100%; height: 100%">
        <h1>Prompts</h1>
        <Toolbar style="width: 100%">
            <template #start>
                <div>
                    <label for="agentDropdown">Agent Name:</label>
                    <Dropdown id="agentDropdown" v-model="selectedAgent" :options="agents" optionLabel="name"
                        @change="fetchConversationIds" />
                </div>
                <div>
                    <label for="accountName">Account Name:</label>
                    <input type="text" id="accountName" v-model="accountName" @input="fetchConversationIds" />
                </div>
                <div>
                    <label for="conversationIdDropdown">Conversation ID:</label>
                    <Dropdown id="conversationIdDropdown" v-model="selectedConversationId" :options="conversationIds" />
                </div>
                <Button label="Fetch Prompts" @click="fetchPrompts" />
            </template>
        </Toolbar>

        <DataTable :value="prompts">
            <Column field="id" header="ID"></Column>
            <Column field="total_chars" header="Total Chars"></Column>
            <Column field="utc_timestamp" header="Timestamp"></Column>
            <Column field="conversationId" header="Conversation ID"></Column>
            <Column>
                <template #header>
                    <span>Actions</span>
                </template>
                <template #body="slotProps">
                    <Button icon="pi pi-pencil" @click="openEditPromptDialog(slotProps.data)"></Button>
                    <Button icon="pi pi-trash" @click="deletePrompt(slotProps.data.id)" class="p-button-danger"></Button>
                </template>
            </Column>
        </DataTable>

        <Dialog v-model:visible="editPromptDialogVisible" :modal="true" :style="{ width: '50%' }" header="Edit Prompt">
            <div v-if="selectedPrompt">
                <h3>Conversation</h3>
                <ol>
                    <li v-for="(entry, index) in selectedPrompt.conversation" :key="index">
                        <b>{{ entry.role }}:</b> {{ entry.content }}
                    </li>
                </ol>
                <h3>Keywords</h3>

                <Chip v-for="(keyword, index) in selectedPrompt.keywords" :key="index">{{ keyword }}</Chip>

            </div>
            <template #footer>
                <Button label="Save" @click="updatePrompt" />
                <Button label="Cancel" @click="closeEditPromptDialog" />
            </template>
        </Dialog>
    </div>
</template>
  
<script>
import DataService from "../DataService";
import { useSettingStore } from "../stores/SettingStore.js";


export default {
    components: {
    },
    name: "Prompts",
    data() {
        return {
            agents: [],
            selectedAgent: "",
            accountName: "",
            prompts: [],
            isLoading: false,
            editPromptDialogVisible: false,
            selectedPrompt: null,
            dataService: null,
            conversationIds: [],
            selectedConversationId: null,
        };
    },
    watch: {
        selectedAgent() {
            try {
                this.store.agentName = newAgentName;
                this.fetchConversationIds();
            } catch (error) {
                console.error(error);
            }
        },
        accountName() {
            try {
                this.store.accountName = newAccountName;
                this.fetchConversationIds();
            } catch (error) {
                console.error(error);
            }
        },
    },
    mounted() {
        this.store = useSettingStore();
        this.dataService = this.store.dataService;
        this.selectedAgent = this.store.getAgentName;
        this.accountName = this.store.getAccountName;
        this.fetchAgentNames();
        this.fetchConversationIds();
        //this.conversationId = Date.now().toString();
    },
    computed: {},
    methods: {
        async fetchAgentNames() {
            try {
                const agentNames = await this.dataService.getAgentNames();
                this.agents = agentNames.map(agentName => ({ name: agentName }));
            } catch (error) {
                console.error("Error fetching agent names:", error);
            }
        },
        async fetchConversationIds() {
            try {
                const response = await this.dataService.getConversationIds(this.selectedAgent.name, this.accountName);
                this.conversationIds = response;
                this.selectedConversationId = this.conversationIds.length > 0 ? this.conversationIds[0] : null;
            } catch (error) {
                console.error(error);
            }
        },
        async fetchPrompts() {
            try {
                this.isLoading = true;
                const prompts = await this.dataService.getPrompts(
                    this.selectedAgent.name,
                    this.accountName,
                    this.selectedConversationId
                );
                this.prompts = prompts;
            } catch (error) {
                console.error("Error fetching prompts:", error);
            } finally {
                this.isLoading = false;
            }
        },

        openEditPromptDialog(prompt) {
            this.selectedPrompt = prompt;
            this.editPromptDialogVisible = true;
        },

        closeEditPromptDialog() {
            this.editPromptDialogVisible = false;
            this.selectedPrompt = null;
        },

        async updatePrompt() {
            try {
                await this.dataService.updatePrompt(
                    this.selectedAgent,
                    this.accountName,
                    this.selectedPrompt.id,
                    this.selectedPrompt
                );
                this.editPromptDialogVisible = false;
                this.selectedPrompt = null;
                this.fetchPrompts();
            } catch (error) {
                console.error("Error updating prompt:", error);
            }
        },

        async deletePrompt(id) {
            try {
                await this.dataService.deletePrompt(this.selectedAgent, this.accountName, id);
                this.fetchPrompts();
            } catch (error) {
                console.error("Error deleting prompt:", error);
            }
        },
    },
};
</script>

  