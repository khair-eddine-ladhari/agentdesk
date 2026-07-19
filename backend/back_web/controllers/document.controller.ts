import { Response } from "express";
import path from "path";
import DocumentModel from "../models/Document";
import { TenantRequest } from "../middleware/tenantScope";

const EXT_TO_TYPE: Record<string, "txt" | "md" | "pdf" | "docx"> = {
  ".txt": "txt",
  ".md": "md",
  ".pdf": "pdf",
  ".docx": "docx",
};

export async function uploadDocument(req: TenantRequest, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileType = EXT_TO_TYPE[ext];
    if (!fileType) {
      return res.status(400).json({ error: `Unsupported file type: ${ext}` });
    }

    const doc = await DocumentModel.create({
      workspace: req.workspaceId,
      uploadedBy: req.userId,
      filename: req.file.originalname,
      fileType,
      status: "pending", // flips to "embedded" once the Python service processes it
    });

    // NOTE: this only stores the file + metadata. Actually sending the file's
    // text to the Python service for chunking/embedding into Pinecone is not
    // wired up yet - that's part of the RAG agent work we're deferring for now.

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to upload document" });
  }
}

export async function listDocuments(req: TenantRequest, res: Response) {
  try {
    const docs = await DocumentModel.find({ workspace: req.workspaceId }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: "Failed to list documents" });
  }
}