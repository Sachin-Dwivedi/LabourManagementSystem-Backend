import mongoose from "mongoose";

const notificationsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
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
      enum: ["sent", "failed", "read"],
      required: [true, "Status is Required"],
    },

    sentAt: {
      type: Date,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationsSchema);

export default Notification;
