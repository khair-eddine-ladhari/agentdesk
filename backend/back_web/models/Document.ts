import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export interface IUploadedDocument extends MongooseDocument {
  workspace: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  filename: string;
  fileType: "txt" | "md" | "pdf" | "docx";
  status: "pending" | "embedded" | "failed";
}

const documentSchema = new Schema<IUploadedDocument>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    filename: { type: String, required: true },
    fileType: { type: String, enum: ["txt", "md", "pdf", "docx"], required: true },
    status: { type: String, enum: ["pending", "embedded", "failed"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model<IUploadedDocument>("Document", documentSchema);