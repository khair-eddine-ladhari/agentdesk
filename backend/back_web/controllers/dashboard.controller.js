const User = require("../models/User");
const Document = require("../models/Document");
const Task = require("../models/Task");
const Meeting = require("../models/Meeting");
const ChatMessage = require("../models/ChatMessage");


async function getDashboardStats(req, res) {
  try {
    const workspaceId = req.headers["x-workspace-id"];

    if (!workspaceId) {
      return res.status(400).json({
        message: "Workspace ID is required",
      });
    }


    const [
      userCount,
      documentCount,
      taskCount,
      meetingCount,
      messageCount,
    ] = await Promise.all([

      // Users in this workspace
      User.countDocuments({
        workspaces: workspaceId,
      }),

      // Documents belonging to this workspace
      Document.countDocuments({
        workspace: workspaceId,
      }),

      // Tasks belonging to this workspace
      Task.countDocuments({
        workspace: workspaceId,
      }),

      // Meetings belonging to this workspace
      Meeting.countDocuments({
        workspace: workspaceId,
      }),

      // Messages belonging to this workspace
      ChatMessage.countDocuments({
        workspace: workspaceId,
      }),

    ]);


    res.json({
      userCount,
      documentCount,
      taskCount,
      meetingCount,
      messageCount,
    });


  } catch (err) {
    console.error("Dashboard stats error:", err);

    res.status(500).json({
      message: "Couldn't load dashboard stats",
    });
  }
}


module.exports = { getDashboardStats };