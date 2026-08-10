import PipelineRun from '../models/PipelineRun.js';

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
