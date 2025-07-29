import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
    },
    startDate: {
      type: Date,
      validate: {
        validator: function (value) {
          // Ensure startDate <= endDate if endDate is set
          return !this.endDate || value <= this.endDate;
        },
        message: "Start date must be less than or equal to end date",
      },
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "completed", "pending", "cancelled", "archived"],
      default: "pending",
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedLabourers: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Labourer"
  }
]

  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// Optional instance method to check if project is currently active
projectSchema.methods.isActive = function () {
  const now = new Date();
  return this.startDate && this.startDate <= now && (!this.endDate || this.endDate >= now);
};

const Project = mongoose.model("Project", projectSchema);

export default Project;
