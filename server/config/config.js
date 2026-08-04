import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,

  // Optional: used only when MongoDB is configured
  mongoUri: process.env.MONGODB_URI,

  // Groq API configuration
  groqKey: process.env.GROQ_API_KEY,
  model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
};