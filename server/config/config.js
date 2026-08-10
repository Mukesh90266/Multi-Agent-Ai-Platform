import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Resolve .env path relative to this config file — works regardless of CWD
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");

const dotenvResult = dotenv.config({ path: envPath });

export const config = {
  port: process.env.PORT || 5000,

  // MongoDB connection — defaults to local MongoDB for development
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/multi-agent-pipeline",

  // Groq API configuration
  groqKey: process.env.GROQ_API_KEY,
  model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
};

// Log env loading status (helps debug)
if (dotenvResult.error) {
  console.log(`⚠ .env not found at ${envPath} — using defaults & env vars`);
} else {
  console.log(`✅ .env loaded from ${envPath}`);
  if (process.env.MONGODB_URI) {
    const uri = process.env.MONGODB_URI;
    // Mask credentials in log
    const masked = uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
    console.log(`✅ MONGODB_URI found: ${masked}`);
  } else {
    console.log("⚠ MONGODB_URI not in .env — using default local MongoDB");
  }
}
