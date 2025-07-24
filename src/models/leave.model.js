import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({
  labourerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "labourer",
  },
  fromDate: Date,
  toDate: Date,
  reason: {
    type: String,
    required: [true, "Reason must be mentioned"],
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
  },
  appliedOn: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
},{timestamps: true});

const Leave = mongoose.model("Leave", leaveSchema);

export default Leave;
