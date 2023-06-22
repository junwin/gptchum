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

  async askQuestionMultiAgent(question, agentName, accountName, conversationId, selectType, secondaryAgent) {
    try {
      if(agentName == "glinda") {
        secondaryAgent = "dorothy";
        const response = await this.apiClient.post("/ask", { question, agentName, accountName, conversationId, selectType, secondaryAgent});
        return response.data;
      } else {
        const response = await this.apiClient.post("/ask", { question, agentName, accountName, conversationId, selectType});
        return response.data;
      }
      
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getAgentNames() {
    try {
      const response = await this.apiClient.get("/agents");
      const agents = response.data;
      const agentNames = agents.map(agent => agent.name);
      return agentNames;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getPrompts(agentName, accountName, conversationId) {
    try {
      const response = await this.apiClient.get("/completions", {
        params: {
          agentName,
          accountName,
          conversationId,
        },
      });


      return response.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async updatePrompt(agentName, accountName, id, prompt) {
    try {
      const response = await this.apiClient.put("/completions", prompt, {
        params: {
          agentName,
          accountName,
          id,
        },
      });
      return response.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async deletePrompt(agentName, accountName, id) {
    try {
      const response = await this.apiClient.delete("/completions", {
        params: {
          agentName,
          accountName,
          id,
        },
      });
      return response.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getConversationIds(agentName, accountName) {
    try {
      const response = await this.apiClient.get("/conversationIds", {
        params: {
          agentName,
          accountName,
        },
      });
      return response.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async renameConversationId(agentName, accountName, existingId, newId) {
    try {
      const response = await this.apiClient.put("/conversationIds", null, {
        params: {
          agentName,
          accountName,
          existingId,
          newId,
        },
      });
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
