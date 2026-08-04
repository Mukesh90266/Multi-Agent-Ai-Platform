import PipelineRun from '../models/PipelineRun.js';
export async function getHistory(req, res) { 
    if (!req.app.locals.mongoReady) 
     return res.json({ success: true, runs: [], message: 'MongoDB is not connected; history is unavailable.' });
     const runs = await PipelineRun.find().sort({ createdAt: -1 }).limit(30); 
     res.json({ success: true, runs }); }
