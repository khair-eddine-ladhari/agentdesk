const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    workspaces: [{ type: mongoose.Schema.Types.ObjectId, ref: "Workspace" }],
  },
  { timestamps: true }
);

// Runs automatically before every .save() - hashes the password if it changed.
// Uses async/await with no `next` param - Mongoose treats the returned
// promise as the completion signal, so mixing in an explicit next() call
// (as before) caused "next is not a function".
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method - lets us call user.comparePassword("typedPassword")
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);