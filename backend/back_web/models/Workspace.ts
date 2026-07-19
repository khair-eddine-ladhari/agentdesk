import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export interface IWorkspace extends MongooseDocument {
  name: string;
  owner: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  pineconeNamespace: string; // one namespace per workspace, enforces data isolation in RAG
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    pineconeNamespace: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model<IWorkspace>("Workspace", workspaceSchema);