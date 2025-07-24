import mongoose from "mongoose";

const labourerSchema = new mongoose.schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // link to User
  fullName: {
    type: String,
    required: [true, " Full Name is required"],
  },

  age: {
    type: String,
    required: [true, " Age is required"],
  },
  gender: {
    type: String,
    enum: ["male", "female", "others"],
    required: [true, " Gender is required"],
  },
  contactNumber: {
    type: Number,
    required: [true, " Contact is required"],
  },
  address: {
    type: String,
    required: [true, " Address is required"],
  },
  assignedProjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
  },

  joiningDate: {
    type: Date,
  },

  skillType: {
    type: String,
    required: [true, " Skill Type is required"],
  },
  profilePhoto: {
    publicId: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  }, // URL

  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "inactive",
  },
},{
     timestamps: true
});

const Labourer = mongoose.model("Labourer", labourerSchema);

export default Labourer;
