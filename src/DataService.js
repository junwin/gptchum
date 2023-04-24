import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://192.168.1.245:5000",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Add these variables outside the export default
let mediaRecorder = null;
let transcription = "";

export default {
  async askQuestion(question, agentName, accountName) {
    try {
      const response = await apiClient.post("/ask", { question, agentName, accountName });
      return response.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  // ... rest of the code ...
};
