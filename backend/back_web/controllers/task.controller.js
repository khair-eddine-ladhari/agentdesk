const Task = require("../models/Task");

async function getTasks(req, res) {
  const { workspaceId } = req.params;
  try {
    const tasks = await Task.find({ workspace: workspaceId }).sort({ createdAt: -1 });
    return res.json(tasks);
  } catch (err) {
    console.error("Failed to fetch tasks:", err);
    return res.status(500).json({ message: "Couldn't load tasks" });
  }
}

async function deleteTask(req, res) {
  const { workspaceId, taskId } = req.params;
  try {
    const task = await Task.findOne({ _id: taskId, workspace: workspaceId });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    await task.deleteOne();
    return res.status(200).json({ success: true, deletedId: taskId });
  } catch (err) {
    console.error("Failed to delete task:", err);
    return res.status(500).json({ message: "Couldn't delete task" });
  }
}

module.exports = { getTasks, deleteTask };