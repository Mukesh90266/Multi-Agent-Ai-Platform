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
      enum: ["approved", "needs_revision", "error"],
      default: "needs_revision"
    },

    totalIterations: Number,
    maxIterations: Number,
    reachedMaxIterations: Boolean,
    approved: Boolean,

    agentStatus: mongoose.Schema.Types.Mixed,

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
