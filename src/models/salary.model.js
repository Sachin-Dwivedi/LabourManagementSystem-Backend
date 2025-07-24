import mongoose from "mongoose"

const salarySchema = new mongoose.Schema({
  labourerId: {
    type : mongoose.Schema.Types.ObjectId,
    ref: "labourer"
  },
  startPeriod: Date,
  endPeriod: Date,
  totalDaysPresent: {
    type : Number,
    required:[true,"Total Days Present is required"]
  },
  dailyWage:{
    type : Number,
    required:[true,"Daily Wage is required"]
  },
  totalSalary: {
    type : Number,
    required:[true,"Total Salary is required"]
  },
  status: {
    type : String,
    enum: ["pending", "paid"],
    required:[true,"Status Present is required"]
  },
  payslipUrl: {
    type : String,
    required:[true,"Pay Slip Url is required"]
  }
})

const Salary = mongoose.model("Salary", salarySchema)

export default Salary;