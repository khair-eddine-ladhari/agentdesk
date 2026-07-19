import { Response } from "express";
import { randomUUID } from "crypto";
import Workspace from "../models/Workspace";
import { AuthRequest } from "../middleware/auth";

export async function createWorkspace(req: AuthRequest, res: Response) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const workspace = await Workspace.create({
      name,
      owner: req.userId,
      members: [req.userId],
      // unique namespace so this workspace's vectors never mix with another's in Pinecone
      pineconeNamespace: `ws-${randomUUID()}`,
    });

    res.status(201).json(workspace);
  } catch (err) {
    res.status(500).json({ error: "Failed to create workspace" });
  }
}

export async function listMyWorkspaces(req: AuthRequest, res: Response) {
  try {
    const workspaces = await Workspace.find({
      $or: [{ owner: req.userId }, { members: req.userId }],
    });
    res.json(workspaces);
  } catch (err) {
    res.status(500).json({ error: "Failed to list workspaces" });
  }
}