import mongoose from "mongoose";

const notificationsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  message: {
    type: String,
    required: [true, "Message is Required"],
  },
  type: {
    type: String,
    enum: ["email", "sms"],
    required: [true, "Notification type is Required"],
  },
  status: {
    type: String,
    enum: ["sent", "failed"],
    required: [true, "Status is Required"],
  },
  createdAt: Date,
},{timestamps: true});

const Notifications = mongoose.model("Notifications", notificationsSchema);

export default Notifications;
