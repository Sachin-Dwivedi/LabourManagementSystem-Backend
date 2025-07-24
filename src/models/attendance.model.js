import mongoose from  "mongoose"

const attendanceSchema = new mongoose.Schema({

  labourerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref : "labourer"
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref : "project"
  },
  date: Date,
  shift: {
    type : String,
    enum : ["morning", "evening", "night"],
    required : [true, "Shift is required"]
  },
  status: {
    type : String,
    enum : ["present", "absent", "half-day"],
    required : [true, "status is required"]
  },
  markedBy:{
    type : mongoose.Schema.Types.ObjectId,
    ref: "User"
  } // user who marked it

})

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;