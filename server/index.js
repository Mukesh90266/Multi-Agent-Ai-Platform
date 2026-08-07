import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import { config } from "./config/config.js";
import pipelineRoutes from "./routes/pipelineRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import { logger } from "./utils/logger.js";

console.log("Groq key detected:", Boolean(config.groqKey));

const app = express();

app.locals.mongoReady = false;

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Backend health check
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    mongoConnected: app.locals.mongoReady,
    researcherConfigured: Boolean(config.groqKey)
  });
});

// API routes
app.use("/api/pipeline", pipelineRoutes);
app.use("/api/history", historyRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err);

  res.status(500).json({
    success: false,
    message: "Internal server error."
  });
});

// MongoDB connection with Atlas-friendly options
const isAtlas = config.mongoUri.includes("mongodb+srv://");

const mongoOptions = isAtlas
  ? {
      // Atlas-specific: longer timeouts, modern auth, retry
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 30000,
      retryWrites: true,
      w: "majority",
      maxPoolSize: 10
    }
  : {
      // Local MongoDB: fast fail
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    };

// Mask credentials for logging
const maskedUri = config.mongoUri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
logger.info(`Connecting to MongoDB: ${maskedUri} (${isAtlas ? "Atlas" : "Local"})`);

mongoose
  .connect(config.mongoUri, mongoOptions)
  .then(() => {
    app.locals.mongoReady = true;
    logger.info(`✅ MongoDB connected: ${maskedUri}`);
  })
  .catch((error) => {
    app.locals.mongoReady = false;
    const errMsg = error.message || "";

    if (errMsg.includes("querySrv") || errMsg.includes("ECONNREFUSED")) {
      logger.warning(`MongoDB Atlas DNS/network error: ${errMsg}`);
      logger.warning("Possible fixes for Atlas:");
      logger.warning("  1. Add your IP to Atlas Network Access (Security → Network Access → Add IP)");
      logger.warning("  2. Check if VPN/proxy is blocking DNS SRV lookups");
      logger.warning("  3. Try replacing mongodb+srv:// with mongodb:// + direct connection string");
      logger.warning("  4. Verify username/password in the URI are correct");
    } else if (errMsg.includes("AuthenticationFailed") || errMsg.includes("bad auth")) {
      logger.warning(`MongoDB auth failed: ${errMsg}`);
      logger.warning("Check username & password in MONGODB_URI");
    } else {
      logger.warning(`MongoDB not available (${errMsg}). Pipeline history will not be persisted.`);
    }

    logger.warning("Set MONGODB_URI in server/.env or ensure MongoDB is running locally.");
  });

// Start Express server
app.listen(config.port, () => {
  logger.info(`Server running at http://localhost:${config.port}`);
});
