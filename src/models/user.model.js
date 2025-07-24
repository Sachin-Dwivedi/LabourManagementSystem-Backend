import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  email: {
    type: String,
    unique: true,
    required: [true, "Email is required"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    select: false,
  }, // hashed
  phone: {
    type: Number
  },
  role: {
    type: String,
    enum: ["admin", "manager", "labourer"],
    default: "labourer",
  },
},{
    timestamps: true
});

const User = mongoose.model("User", userSchema);

export default User;
