import axios from "axios";

class DataService {
  constructor(baseUrl) {
    this.apiClient = axios.create({
      baseURL: baseUrl,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  }

  async askQuestion(question, agentName, accountName, conversationId, selectType) {
    try {
      const response = await this.apiClient.post("/ask", { question, agentName, accountName, conversationId, selectType });
      return response.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getAgentNames() {
    try {
      const response = await this.apiClient.get("/agents");
      const agents = response.data;
      const agentNames = agents.map(agent => agent.agentName);
      return agentNames;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  getPrompts(agentName, accountName, conversationId) {
    return this.apiClient.get("/prompts", {
      params: {
        agentName,
        accountName,
        conversationId,
      },
    });
  }

  updatePrompt(agentName, accountName, id, prompt) {
    return this.apiClient.put("/prompts", prompt, {
      params: {
        agentName,
        accountName,
        id,
      },
    });
  }

  deletePrompt(agentName, accountName, id) {
    return this.apiClient.delete("/prompts", {
      params: {
        agentName,
        accountName,
        id,
      },
    });
  }

  getConversationIds(agentName, accountName) {
    return this.apiClient.get("/conversationIds", {
      params: {
        agentName,
        accountName,
      },
    });
  }

  renameConversationId(agentName, accountName, existingId, newId) {
    return this.apiClient.put("/conversationIds", null, {
      params: {
        agentName,
        accountName,
        existingId,
        newId,
      },
    });
  }

  computeConversations(data) {
    return this.apiClient.post("/computeConversations", data);
  }
}

export default DataService;
