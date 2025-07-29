import mongoose from "mongoose"

const leaveSchema = new mongoose.Schema({
  labourerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Labourer",
    required: [true, "Labourer ID is required"],
  },
  fromDate: {
    type: Date,
    required: [true, "fromDate is required"],
  },
  toDate: {
    type: Date,
    required: [true, "toDate is required"],
    validate: {
      validator: function (value) {
        return !this.fromDate || value >= this.fromDate;
      },
      message: "toDate must be greater than or equal to fromDate",
    }
  },
  reason: {
    type: String,
    required: [true, "Reason must be mentioned"],
    maxlength: [500, "Reason must be at most 500 characters long"],
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    required: true,
  },
  appliedOn: {
    type: Date,
    default: () => new Date(),
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  remarks: {
  type: String}
}, { timestamps: true });

const Leave = mongoose.model("Leave",leaveSchema)

export default Leave;