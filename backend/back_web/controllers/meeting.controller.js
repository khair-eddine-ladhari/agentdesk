const Meeting = require("../models/Meeting");

async function getMeetings(req, res) {
  const { workspaceId } = req.params;
  try {
    const meetings = await Meeting.find({ workspace: workspaceId }).sort({ createdAt: -1 });
    return res.json(meetings);
  } catch (err) {
    console.error("Failed to fetch meetings:", err);
    return res.status(500).json({ message: "Couldn't load meetings" });
  }
}

async function deleteMeeting(req, res) {
  const { workspaceId, meetingId } = req.params;
  try {
    const meeting = await Meeting.findOne({ _id: meetingId, workspace: workspaceId });
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }
    await meeting.deleteOne();
    return res.status(200).json({ success: true, deletedId: meetingId });
  } catch (err) {
    console.error("Failed to delete meeting:", err);
    return res.status(500).json({ message: "Couldn't delete meeting" });
  }
}

module.exports = { getMeetings, deleteMeeting };