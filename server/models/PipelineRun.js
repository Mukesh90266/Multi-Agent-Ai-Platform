import mongoose from "mongoose";

const PipelineRunSchema = new mongoose.Schema(
  {
    topic: String,
    contentType: String,
    audience: String,
    tone: String,
    wordCount: Number,

    status: {
      type: String,
      default: "writing_completed"
    },

    agentStatus: mongoose.Schema.Types.Mixed,

    research: mongoose.Schema.Types.Mixed,

    draft: {
      content: String,
      wordCount: Number,
      mode: String
    },
    research: mongoose.Schema.Types.Mixed,

draft: {
  content: String,
  wordCount: Number,
  mode: String
},

editorReview: mongoose.Schema.Types.Mixed,

optimization: mongoose.Schema.Types.Mixed,

iterations: [mongoose.Schema.Types.Mixed],

    iterations: [mongoose.Schema.Types.Mixed],

    error: String
  },
  {
    timestamps: true
  }
);

export default mongoose.models.PipelineRun ||
  mongoose.model("PipelineRun", PipelineRunSchema);