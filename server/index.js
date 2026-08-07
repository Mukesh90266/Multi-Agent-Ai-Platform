import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { execSync } from "node:child_process";

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
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        w: "majority"
      };
}

/**
 * Ensure URI has a database name.
 * Atlas URIs sometimes miss the db name: mongodb+srv://user:pass@host/?params
 */
function ensureDatabaseName(uri) {
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/[^@]+@[^\/]+)(\/?)(.*)$/);
  if (!match) return uri;

  const [, prefix, slash, rest] = match;

  if (!slash) {
    return `${prefix}/multi-agent-pipeline`;
  }

  if (slash && (!rest || rest.startsWith("?"))) {
    const params = rest.startsWith("?") ? rest : "";
    return `${prefix}/multi-agent-pipeline${params ? "?" + params.slice(1) : ""}`;
  }

  return uri;
}

/**
 * Make an HTTP GET request — tries native fetch first,
 * falls back to curl (for environments where fetch is restricted).
 */
async function httpGet(url) {
  // Attempt 1: Node.js native fetch
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/dns-json" }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (fetchError) {
    // Attempt 2: curl fallback
    try {
      const result = execSync(
        `curl -s -m 8 -H "Accept: application/dns-json" "${url}"`,
        { encoding: "utf8", timeout: 10000 }
      );
      return JSON.parse(result);
    } catch (curlError) {
      throw new Error(`fetch: ${fetchError.message} | curl: ${curlError.message}`);
    }
  }
}

/**
 * Resolve SRV records via DNS-over-HTTPS (Google Public DNS).
 * Bypasses system DNS entirely — works when SRV queries are blocked.
 */
async function resolveSrvViaDoH(srvRecord) {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(srvRecord)}&type=SRV`;

  try {
    logger.info(`DoH SRV lookup: ${srvRecord}`);

    const data = await httpGet(url);

    if (data.Status !== 0 || !data.Answer?.length) {
      logger.warning(`DoH: No SRV records (Status: ${data.Status})`);
      return null;
    }

    const records = [];
    for (const answer of data.Answer) {
      if (answer.type !== 33) continue; // Type 33 = SRV
      const parts = answer.data.trim().split(/\s+/);
      if (parts.length >= 4) {
        records.push({
          priority: parseInt(parts[0], 10),
          weight: parseInt(parts[1], 10),
          port: parseInt(parts[2], 10),
          name: parts[3].replace(/\.$/, "")
        });
      }
    }

    if (!records.length) {
      logger.warning("DoH: SRV type found but no parseable records");
      return null;
    }

    records.sort((a, b) => a.priority - b.priority || b.weight - a.weight);
    return records;
  } catch (error) {
    logger.warning(`DoH SRV failed: ${error.message}`);
    return null;
  }
}

/**
 * Resolve TXT records via DNS-over-HTTPS.
 * Atlas TXT records contain: replicaSet=atlas-xxxxx-shard-0&...
 */
async function resolveTxtViaDoH(hostname) {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=TXT`;

  try {
    logger.info(`DoH TXT lookup: ${hostname}`);

    const data = await httpGet(url);

    if (data.Status !== 0 || !data.Answer?.length) {
      return null;
    }

    // Combine all TXT record data
    const txtParts = [];
    for (const answer of data.Answer) {
      if (answer.type === 16) { // Type 16 = TXT
        // TXT data may be quoted: "replicaSet=atlas-xxx"
        let txt = answer.data.replace(/^"|"$/g, "");
        txtParts.push(txt);
      }
    }

    return txtParts.join("&");
  } catch {
    return null;
  }
}

/**
 * Convert mongodb+srv:// URI to standard mongodb:// URI
 * using DNS-over-HTTPS for SRV + TXT record resolution.
 */
async function convertSrvToStandardViaDoH(srvUri) {
  const match = srvUri.match(/^mongodb\+srv:\/\/([^@]+)@([^\/]+)(\/?.*)$/);
  if (!match) return null;

  const [, credentials, srvHost, rest] = match;
  const srvRecord = `_mongodb._tcp.${srvHost}`;

  // Step 1: Resolve SRV records
  const srvRecords = await resolveSrvViaDoH(srvRecord);
  if (!srvRecords?.length) return null;

  logger.info(`DoH resolved ${srvRecords.length} shard(s):`);
  for (const r of srvRecords) {
    logger.info(`   → ${r.name}:${r.port}`);
  }

  // Step 2: Build host:port list
  const hosts = srvRecords.map(r => `${r.name}:${r.port}`).join(",");

  // Step 3: Resolve TXT records for replicaSet + authSource
  const txtData = await resolveTxtViaDoH(srvHost);
  const txtParams = txtData || "";

  // Step 4: Build standard URI with all required Atlas params
  let pathAndParams = rest || "/";
  if (!pathAndParams.startsWith("/")) pathAndParams = "/" + pathAndParams;

  // Ensure database name
  if (pathAndParams === "/" || pathAndParams.startsWith("/?")) {
    const q = pathAndParams.startsWith("/?") ? pathAndParams.slice(2) : "";
    pathAndParams = `/multi-agent-pipeline${q ? "?" + q : ""}`;
  }

  // Merge TXT params (replicaSet, authSource, etc.)
  if (txtParams && !pathAndParams.includes(txtParams)) {
    pathAndParams += pathAndParams.includes("?") ? `&${txtParams}` : `?${txtParams}`;
  }

  // Add required Atlas connection params
  const requiredParams = [
    ["ssl", "true"],
    ["authSource", "admin"],
    ["retryWrites", "true"],
    ["w", "majority"]
  ];

  for (const [key, value] of requiredParams) {
    if (!pathAndParams.includes(`${key}=`)) {
      pathAndParams += pathAndParams.includes("?") ? `&${key}=${value}` : `?${key}=${value}`;
    }
  }

  const standardUri = `mongodb://${credentials}@${hosts}${pathAndParams}`;
  return standardUri;
}

async function tryConnect(uri, options) {
  const isAtlas = uri.includes("mongodb+srv://");
  const masked = maskUri(uri);
  logger.info(`Connecting to MongoDB: ${masked} (${isAtlas ? "Atlas SRV" : "Standard"})`);
  await mongoose.connect(uri, options);
  app.locals.mongoReady = true;
  logger.info(`✅ MongoDB connected: ${masked}`);
}

async function connectMongoDB() {
  let uri = ensureDatabaseName(config.mongoUri);
  const isAtlas = uri.includes("mongodb+srv://");

  // ── Attempt 1: Direct SRV connection ──
  try {
    await tryConnect(uri, getMongoOptions(isAtlas));
    return;
  } catch (error) {
    const errMsg = error.message || "";

    const isDnsError =
      errMsg.includes("querySrv") ||
      errMsg.includes("ENOTFOUND") ||
      errMsg.includes("ECONNREFUSED") ||
      errMsg.includes("ESERVFAIL") ||
      errMsg.includes("TxtAndSrvRecordMustBeSame");

    if (!isDnsError) {
      if (errMsg.includes("AuthenticationFailed") || errMsg.includes("bad auth")) {
        logger.warning(`❌ MongoDB auth failed: ${errMsg.split("\n")[0]}`);
        logger.warning("   Check username & password in MONGODB_URI");
      } else {
        logger.warning(`❌ MongoDB error: ${errMsg.split("\n")[0]}`);
      }
      logger.warning("   Pipeline history will use file-based storage.");
      return;
    }

    // ── DNS error → DoH fallback ──
    logger.warning(`⚠️  SRV DNS blocked: ${errMsg.split("\n")[0]}`);

    if (!isAtlas) {
      logger.warning("   Non-Atlas URI — check hostname / network.");
      return;
    }

    logger.info("");
    logger.info("🔄 Fallback: Resolving Atlas shards via DNS-over-HTTPS...");

    const standardUri = await convertSrvToStandardViaDoH(uri);

    if (standardUri) {
      try {
        await tryConnect(standardUri, getMongoOptions(false));
        logger.info("✅ Connected via DNS-over-HTTPS fallback!");
        return;
      } catch (fallbackError) {
        const fbMsg = fallbackError.message || "";
        logger.warning(`❌ DoH fallback failed: ${fbMsg.split("\n")[0]}`);

        if (fbMsg.includes("AuthenticationFailed") || fbMsg.includes("bad auth")) {
          logger.warning("   DNS worked but auth failed — check username & password");
          return;
        }
      }
    }

    logger.warning("");
    logger.warning("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.warning("⚠️  MongoDB Atlas UNREACHABLE");
    logger.warning("   Pipeline history will use file-based storage.");
    logger.warning("");
    logger.warning("   Fixes:");
    logger.warning("   1. Atlas → Connect → Drivers → copy STANDARD (mongodb://) string");
    logger.warning("      Set MONGODB_URI in server/.env to that string");
    logger.warning("   2. Change system DNS to 8.8.8.8 / 8.8.4.4");
    logger.warning("   3. Disable VPN/proxy that blocks DNS SRV queries");
    logger.warning("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.warning("");
  }
}

// Start MongoDB connection (non-blocking — server starts immediately)
connectMongoDB();

// Start Express server
app.listen(config.port, () => {
  logger.info(`Server running at http://localhost:${config.port}`);
});
