import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    labourerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Labourer",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    shift: {
      type: String,
      enum: ["morning", "evening", "night"],
      required: [true, "Shift is required"],
    },
    status: {
      type: String,
      enum: ["present", "absent", "half-day"],
      required: [true, "Status is required"],
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Prevent duplicate attendance entries for same labourer/project/date/shift
attendanceSchema.index(
  { labourerId: 1, projectId: 1, date: 1, shift: 1 },
  { unique: true }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;
