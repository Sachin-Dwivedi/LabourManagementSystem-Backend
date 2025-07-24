import mongoose from "mongoose"

const preformanceSchema = new mongoose.Schema({
  labourerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "labourer"
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "project"
  },
  date: Date,
  performanceScore: {
    type: Number,
    required: [true, "Score is required"] 
  },
  remarks: {
    type: String,
    required: [true, "Remarks are required"]
  }
});

const Performance = mongoose.model("Performance", preformanceSchema)

export default Performance;