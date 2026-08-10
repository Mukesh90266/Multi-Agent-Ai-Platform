import mongoose from "mongoose";

const PipelineRunSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    topic: String,
    contentType: String,
    audience: String,
    tone: String,
    wordCount: Number,

    status: {
      type: String,
      enum: ["approved", "needs_revision", "completed", "error"],
      default: "completed"
    },

    totalIterations: Number,
    maxIterations: Number,
    executionSteps: Number,
    reachedMaxIterations: Boolean,
    approved: Boolean,

    pipeline: mongoose.Schema.Types.Mixed,
    agentStatus: mongoose.Schema.Types.Mixed,
    agentOutputs: [mongoose.Schema.Types.Mixed],
    finalOutput: mongoose.Schema.Types.Mixed,

    research: mongoose.Schema.Types.Mixed,

    draft: {
      content: String,
      wordCount: Number,
      mode: String
    },

    editorReview: mongoose.Schema.Types.Mixed,

    optimization: mongoose.Schema.Types.Mixed,

    iterations: [mongoose.Schema.Types.Mixed],

    revisionHistory: [mongoose.Schema.Types.Mixed],

    error: String
  },
  {
    timestamps: true
  }
);

export default mongoose.models.PipelineRun ||
  mongoose.model("PipelineRun", PipelineRunSchema);
