import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export interface IActionLog extends MongooseDocument {
  workspace: mongoose.Types.ObjectId;
  agentType: "rag" | "structuring" | "action";
  summary: string; // plain-language description, e.g. "Drafted a follow-up email to Sarah"
  status: "success" | "needs_review" | "failed";
  requiresApproval: boolean;
  approvedBy?: mongoose.Types.ObjectId;
}

const actionLogSchema = new Schema<IActionLog>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    agentType: { type: String, enum: ["rag", "structuring", "action"], required: true },
    summary: { type: String, required: true },
    status: { type: String, enum: ["success", "needs_review", "failed"], default: "needs_review" },
    requiresApproval: { type: Boolean, default: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model<IActionLog>("ActionLog", actionLogSchema);