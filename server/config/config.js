import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,

  // MongoDB connection — defaults to local MongoDB for development
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/multi-agent-pipeline",

  // Groq API configuration
  groqKey: process.env.GROQ_API_KEY,
  model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
};
