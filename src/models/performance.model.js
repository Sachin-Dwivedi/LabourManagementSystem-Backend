import mongoose from "mongoose";

const performanceSchema = new mongoose.Schema(
  {
    labourerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Labourer",
      required: [true, "Labourer ID is required"],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    performanceScore: {
      type: Number,
      required: [true, "Score is required"],
      min: 0,
      max: 100,
    },
    remarks: {
      type: String,
      required: [true, "Remarks are required"],
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

performanceSchema.index(
  { labourerId: 1, projectId: 1, date: 1 },
  { unique: true }
);

const Performance = mongoose.model("Performance", performanceSchema);

export default Performance;
