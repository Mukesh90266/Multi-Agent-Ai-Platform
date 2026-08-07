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

// MongoDB connection
mongoose
  .connect(config.mongoUri)
  .then(() => {
    app.locals.mongoReady = true;
    logger.info(`MongoDB connected at ${config.mongoUri}`);
  })
  .catch((error) => {
    logger.warning(
      `MongoDB not available (${error.message}). Pipeline history will not be persisted.`
    );
    logger.warning(
      'To enable MongoDB: set MONGODB_URI in server/.env or ensure MongoDB is running locally.'
    );
  });

// Start Express server
app.listen(config.port, () => {
  logger.info(`Server running at http://localhost:${config.port}`);
});
