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

  async askQuestion(
    question,
    agentName,
    accountName,
    conversationId,
    selectType,
    contextName
  ) {
    try {
      const response = await this.apiClient.post("/ask", {
        question,
        agentName,
        accountName,
        conversationId,
        selectType,
        contextName,
      });
      return response.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async askQuestionMultiAgent(
    question,
    agentName,
    accountName,
    conversationId,
    selectType,
    secondaryAgent = null,
    contextName
  ) {
    try {
      // Previously this method hard-coded secondaryAgent when agentName was
      // "glinda". That prevented callers from explicitly controlling
      // secondaryAgent/contextName. Keep backwards compatibility by defaulting
      // secondaryAgent to "dorothy" only when the caller does not supply one.
      if (agentName === "glinda" && secondaryAgent == null) {
        secondaryAgent = "dorothy";
      }

      const payload = {
        question,
        agentName,
        accountName,
        conversationId,
        selectType,
        contextName,
      };

      // Only include secondaryAgent when present, so the API receives the same
      // shape as before for single-agent calls.
      if (secondaryAgent != null) {
        payload.secondaryAgent = secondaryAgent;
      }

      const response = await this.apiClient.post("/ask", payload);
      return response.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // --- Chat sessions ---

  async createChat(agentName, accountName, friendlyName = null, tags = null) {
    try {
      const response = await this.apiClient.post("/chats", {
        agentName,
        accountName,
        friendlyName,
        tags,
      });
      return response.data; // { id, account_name, agent_name, friendly_name, ... }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async listChats(accountName, agentName = null, limit = 50) {
    try {
      const response = await this.apiClient.get("/chats", {
        params: { accountName, agentName, limit },
      });
      return response.data; // array of sessions (summary shape)
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getChat(sessionId) {
    try {
      const response = await this.apiClient.get(`/chats/${sessionId}`);
      return response.data; // includes messages[]
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getAgentNames() {
    try {
      const response = await this.apiClient.get("/agents");
      const agents = response.data;
      const agentNames = agents.map((agent) => agent.name);
      return agentNames;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getContextNames(accountName) {
    try {
      if (accountName == null || String(accountName).trim() === "") {
        throw new Error("accountName is required");
      }

      const response = await this.apiClient.get("/context/names", {
        params: { accountName },
      });

      // Lucy returns a JSON array of strings.
      return response.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async computeConversations(data) {
    try {
      const response = await this.apiClient.post("/prompt_builder", data);
      return response.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}

export default DataService;
