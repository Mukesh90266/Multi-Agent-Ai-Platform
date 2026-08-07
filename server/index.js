import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dns from "dns/promises";

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

// ─────────────────────────────────────────────
// MongoDB Connection Logic
// ─────────────────────────────────────────────

function maskUri(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
}

function getMongoOptions(isAtlas) {
  return isAtlas
    ? {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 30000,
        retryWrites: true,
        w: "majority",
        maxPoolSize: 10
      }
    : {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      };
}

async function tryConnect(uri, options) {
  const isAtlas = uri.includes("mongodb+srv://");
  const masked = maskUri(uri);
  logger.info(`Connecting to MongoDB: ${masked} (${isAtlas ? "Atlas SRV" : "Standard"})`);
  await mongoose.connect(uri, options);
  app.locals.mongoReady = true;
  logger.info(`✅ MongoDB connected: ${masked}`);
}

/**
 * If mongodb+srv:// fails with DNS/SRV error, try resolving SRV records
 * manually and converting to standard mongodb:// URI with direct host:port
 */
async function convertSrvToStandard(srvUri) {
  // Parse: mongodb+srv://user:pass@hostname/db?params
  const match = srvUri.match(/^mongodb\+srv:\/\/([^@]+)@([^\/]+)(\/?.*)$/);
  if (!match) return null;

  const [, credentials, srvHost, rest] = match;
  const srvRecord = `_mongodb._tcp.${srvHost}`;

  try {
    logger.info(`Attempting manual SRV lookup: ${srvRecord}`);
    const records = await dns.resolveSrv(srvRecord);

    if (!records.length) return null;

    // Sort by priority (lower = preferred), then weight (higher = preferred)
    records.sort((a, b) => a.priority - b.priority || b.weight - a.weight);

    // Build comma-separated host:port list
    const hosts = records.map(r => `${r.name}:${r.port}`).join(",");

    // Preserve path/params, ensure ssl=true for Atlas
    let pathAndParams = rest || "/?ssl=true";
    if (!pathAndParams.startsWith("/")) pathAndParams = "/" + pathAndParams;
    if (!pathAndParams.includes("ssl=")) {
      pathAndParams += pathAndParams.includes("?") ? "&ssl=true" : "?ssl=true";
    }
    if (!pathAndParams.includes("authSource=")) {
      pathAndParams += "&authSource=admin";
    }

    const standardUri = `mongodb://${credentials}@${hosts}${pathAndParams}`;
    return standardUri;
  } catch (dnsError) {
    logger.warning(`Manual SRV lookup also failed: ${dnsError.message}`);
    return null;
  }
}

async function connectMongoDB() {
  const uri = config.mongoUri;
  const isAtlas = uri.includes("mongodb+srv://");
  const options = getMongoOptions(isAtlas);

  // Attempt 1: Direct connection
  try {
    await tryConnect(uri, options);
    return;
  } catch (error) {
    const errMsg = error.message || "";

    // If it's NOT a DNS/SRV error, no point retrying
    const isDnsError =
      errMsg.includes("querySrv") ||
      errMsg.includes("ENOTFOUND") ||
      errMsg.includes("ECONNREFUSED") ||
      errMsg.includes("ESERVFAIL");

    if (!isDnsError) {
      // Auth error, config error, etc.
      if (errMsg.includes("AuthenticationFailed") || errMsg.includes("bad auth")) {
        logger.warning(`MongoDB auth failed: ${errMsg}`);
        logger.warning("Check username & password in MONGODB_URI");
      } else {
        logger.warning(`MongoDB error: ${errMsg}`);
      }
      logger.warning("Pipeline history will use file-based storage instead.");
      return;
    }

    // DNS/SRV error — try manual SRV resolution for Atlas
    logger.warning(`MongoDB SRV DNS failed: ${errMsg}`);

    if (isAtlas) {
      logger.info("Attempting fallback: manual SRV → standard connection string...");
      const standardUri = await convertSrvToStandard(uri);

      if (standardUri) {
        try {
          const standardOptions = getMongoOptions(false);
          standardOptions.serverSelectionTimeoutMS = 15000;
          await tryConnect(standardUri, standardOptions);
          logger.info("✅ Connected via manual SRV resolution fallback!");
          return;
        } catch (fallbackError) {
          logger.warning(`Fallback connection also failed: ${fallbackError.message}`);
        }
      }
    }

    // All attempts failed
    logger.warning("");
    logger.warning("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.warning("⚠️  MongoDB Atlas UNREACHABLE — DNS SRV queries are blocked");
    logger.warning("   Pipeline history will use file-based storage instead.");
    logger.warning("");
    logger.warning("   To fix MongoDB Atlas connection:");
    logger.warning("   1. Atlas Dashboard → Connect → Drivers → copy STANDARD connection string");
    logger.warning("      (use mongodb:// NOT mongodb+srv://)");
    logger.warning("   2. Replace MONGODB_URI in server/.env with that string");
    logger.warning("   3. Or check if VPN/proxy/firewall is blocking DNS SRV lookups");
    logger.warning("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.warning("");
  }
}

// Start MongoDB connection (non-blocking)
connectMongoDB();

// Start Express server
app.listen(config.port, () => {
  logger.info(`Server running at http://localhost:${config.port}`);
});
