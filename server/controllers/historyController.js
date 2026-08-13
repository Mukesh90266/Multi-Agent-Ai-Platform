import PipelineRun from '../models/PipelineRun.js';
import { buildAnalyticsSummary, listRecentRunCosts } from '../services/costService.js';

export async function getHistory(req, res) {
  try {
    if (!req.app.locals.mongoReady) {
      return res.json({
        success: true,
        runs: [],
        mongoConnected: false,
        message: 'MongoDB is not connected. Set MONGODB_URI in your .env file to enable history.'
      });
    }

    const runs = await PipelineRun.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .select('-iterations -agentOutputs.output -agentOutputs.text -draft.content -finalOutput.content -optimization.optimizedContent -research.keyPoints -research.definitions -research.examples -research.sources');

    res.json({
      success: true,
      runs,
      mongoConnected: true,
      count: runs.length
    });
  } catch (error) {
    res.json({
      success: true,
      runs: [],
      mongoConnected: false,
      message: 'Error fetching history: ' + error.message
    });
  }
}

/**
 * Cost analytics across pipeline runs (spec §8).
 * GET /api/history/cost-analytics
 * MongoDB connected → aggregates stored runs; otherwise falls back to the
 * in-memory ledger of this session's runs. Either way: never crashes on
 * missing/old cost data (spec §11).
 */
export async function getCostAnalytics(req, res) {
  try {
    const mongoReady = Boolean(req.app.locals.mongoReady);
    let runs = [];
    let runsWithoutCost = 0;

    if (mongoReady) {
      const docs = await PipelineRun.find({ "cost.available": true })
        .sort({ createdAt: -1 })
        .limit(200)
        .select("runId topic status createdAt cost");
      runs = docs.map((doc) => ({
        runId: doc.runId,
        topic: doc.topic,
        status: doc.status,
        createdAt: doc.createdAt,
        cost: doc.cost
      }));
      runsWithoutCost = await PipelineRun.countDocuments({
        "cost.available": { $ne: true }
      });
    } else {
      runs = listRecentRunCosts();
    }

    const analytics = buildAnalyticsSummary(runs);
    analytics.summary.runsWithoutCost += runsWithoutCost;

    res.json({
      success: true,
      mongoConnected: mongoReady,
      source: mongoReady ? "mongodb" : "memory",
      ...analytics
    });
  } catch (error) {
    res.json({
      success: false,
      mongoConnected: false,
      message: "Error computing cost analytics: " + error.message,
      summary: null,
      agentBreakdown: [],
      recentRuns: []
    });
  }
}
