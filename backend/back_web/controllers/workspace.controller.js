const { randomUUID } = require("crypto");
const Workspace = require("../models/Workspace");

async function createWorkspace(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const workspace = await Workspace.create({
      name,
      owner: req.userId,
      members: [req.userId],
      pineconeNamespace: `ws-${randomUUID()}`,
    });

    res.status(201).json(workspace);
  } catch (err) {
    res.status(500).json({ error: "Failed to create workspace" });
  }
}

async function listMyWorkspaces(req, res) {
  try {
    const workspaces = await Workspace.find({
      $or: [{ owner: req.userId }, { members: req.userId }],
    });
    res.json(workspaces);
  } catch (err) {
    res.status(500).json({ error: "Failed to list workspaces" });
  }
}

module.exports = { createWorkspace, listMyWorkspaces };