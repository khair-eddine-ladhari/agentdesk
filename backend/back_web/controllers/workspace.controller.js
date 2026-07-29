const { randomUUID } = require("crypto");
const Workspace = require("../models/Workspace");
const User = require("../models/User");

// ---- Create / list ----

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

// ---- Settings: name, members ----

async function serializeMembers(workspace) {
  // members is a plain array of ObjectId refs - populate directly.
  // Role isn't stored per member; it's derived by comparing to `owner`.
  await workspace.populate("members", "name email");
  return workspace.members.map((u) => ({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u._id.toString() === workspace.owner.toString() ? "Owner" : "Member",
  }));
}

async function getSettings(req, res) {
  try {
    const workspace = await Workspace.findById(req.workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const members = await serializeMembers(workspace);

    res.json({
      name: workspace.name,
      members,
    });
  } catch (err) {
    console.error("getSettings error:", err);
    res.status(500).json({ message: "Couldn't load workspace settings" });
  }
}

async function updateName(req, res) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Workspace name is required" });
    }

    const workspace = await Workspace.findByIdAndUpdate(
      req.workspaceId,
      { name: name.trim() },
      { new: true }
    );
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    res.json({ name: workspace.name });
  } catch (err) {
    console.error("updateName error:", err);
    res.status(500).json({ message: "Couldn't update workspace name" });
  }
}

// Simple v1: only works if the email already belongs to an existing User.
// No invite email, no pending state - added immediately or a clear error.
async function inviteMember(req, res) {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({
        message: "No account found with that email. They need to sign up first.",
      });
    }

    const workspace = await Workspace.findById(req.workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const alreadyMember = workspace.members.some(
      (id) => id.toString() === user._id.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({ message: "That person is already a member" });
    }

    workspace.members.push(user._id);
    await workspace.save();

    // Keep User.workspaces in sync - dashboard stats and other queries
    // count members via User.workspaces, not Workspace.members.
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { workspaces: workspace._id },
    });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: "Member",
    });
  } catch (err) {
    console.error("inviteMember error:", err);
    res.status(500).json({ message: "Couldn't add member" });
  }
}

async function removeMember(req, res) {
  try {
    const { userId } = req.params;

    const workspace = await Workspace.findById(req.workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    if (workspace.owner.toString() === userId) {
      return res.status(400).json({ message: "Can't remove the workspace owner" });
    }

    workspace.members = workspace.members.filter((id) => id.toString() !== userId);
    await workspace.save();

    await User.findByIdAndUpdate(userId, { $pull: { workspaces: workspace._id } });

    res.json({ success: true });
  } catch (err) {
    console.error("removeMember error:", err);
    res.status(500).json({ message: "Couldn't remove member" });
  }
}

module.exports = {
  createWorkspace,
  listMyWorkspaces,
  getSettings,
  updateName,
  inviteMember,
  removeMember,
};