// models/Workspace.js
//
// NOTE: I haven't seen your actual Workspace.js (only that it already has
// at least `name` and `pineconeNamespace`, since both are used elsewhere
// in your codebase). This adds the two new pieces this feature needs -
// `members` (who belongs, with what role) and `enabledAgents` (which
// agents are turned on). Merge these fields into your real file rather
// than replacing it outright if it has more than this.

const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  pineconeNamespace: {
    type: String,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ],
}, { timestamps: true }); // matches createdAt/updatedAt/__v already in your data

module.exports = mongoose.model('Workspace', workspaceSchema);