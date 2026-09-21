import axios from "axios";

class DataService {
  constructor(baseUrl, apiKey = "") {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;

    this.apiClient = axios.create({
      baseURL: baseUrl,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    // Attach X-API-Key to every request when an API key is configured
    if (apiKey && apiKey.trim()) {
      this.apiClient.interceptors.request.use((config) => {
        config.headers["X-API-Key"] = apiKey;
        return config;
      });
    }
  }

  async askQuestion(
    question,
    agentName,
    accountName,
    conversationId,
    selectType,
    contextName,
    apiKey
  ) {
    try {
      const payload = {
        question,
        agentName,
        accountName,
        conversationId,
        selectType,
        contextName,
      };
      const headers = {};
      if (apiKey) {
        headers["X-API-Key"] = apiKey;
      }
      const response = await this.apiClient.post("/ask", payload, { headers });
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
    contextName,
    apiKey
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

      const headers = {};
      if (apiKey) {
        headers["X-API-Key"] = apiKey;
      }

      const response = await this.apiClient.post("/ask", payload, { headers });
      return response.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // --- Image upload ---

  async uploadImage(file, accountName) {
    const key = this.apiKey || "";
    const headers = {};
    if (key) {
      headers["X-API-Key"] = key;
    }
    // Don't set Content-Type — browser sets it with multipart boundary

    const formData = new FormData();
    formData.append("file", file);
    formData.append("accountName", accountName);

    const response = await fetch(`${this.baseUrl}/upload/image`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Upload failed: ${response.status} ${err}`);
    }

    return response.json();
  }

  // --- SSE Streaming ---

  async *askQuestionStreaming(
    question,
    agentName,
    accountName,
    conversationId,
    contextName,
    image_ids = null
  ) {
    const key = this.apiKey || "";
    const headers = {
      "Content-Type": "application/json",
    };
    if (key) {
      headers["X-API-Key"] = key;
    }

    const body = {
      question,
      agentName,
      accountName,
      conversationId,
      contextName,
      stream: true,
    };
    if (image_ids && image_ids.length) {
      body.image_ids = image_ids;
    }

    const response = await fetch(`${this.baseUrl}/ask`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`/ask failed: ${response.status} ${err}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on SSE frame boundary: "\n\n"
      const parts = buffer.split("\n\n");
      buffer = parts.pop(); // keep incomplete last chunk

      for (const part of parts) {
        const lines = part.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const json = line.slice(6);
            try {
              yield JSON.parse(json);
            } catch (e) {
              console.warn("Failed to parse SSE event:", json, e);
            }
          }
        }
      }
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

  async listChats(accountName, limit = 50) {
    try {
      const response = await this.apiClient.get("/chats", {
        params: { accountName, limit },
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
