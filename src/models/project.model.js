import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"]
  },
  description: {
    type: String,
    required: [true, "Description is required"]
  },
  location: {
    type: String,
    required: [true, "Location is required"]
  },
  startDate: Date,
  endDate: Date,
  managerId: {
    type : mongoose.Schema.Types.ObjectId,
    ref:"User"
  },
  assignedLabourers: [{
    type : mongoose.Schema.Types.ObjectId,
    ref : "User"
}]
  
  // array of Labourer IDs
});

const Project = mongoose.model("Project", projectSchema);

export default Project;
