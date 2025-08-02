import mongoose from "mongoose";

const salarySchema = new mongoose.Schema(
  {
    labourerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Labourer",
      required: [true, "Labourer ID is required"],
    },
    startPeriod: {
      type: Date,
      required: [true, "Start period is required"],
    },
    endPeriod: {
      type: Date,
      required: [true, "End period is required"],
      validate: {
        validator: function (value) {
          return !this.startPeriod || value >= this.startPeriod;
        },
        message: "End period must be greater than or equal to start period",
      },
    },
    totalDaysPresent: {
      type: Number,
      required: [true, "Total Days Present is required"],
      min: [0, "Total days present cannot be negative"],
    },
    dailyWage: {
      type: Number,
      required: [true, "Daily Wage is required"],
      min: [0, "Daily wage cannot be negative"],
    },
    totalSalary: {
      type: Number,
      required: [true, "Total Salary is required"],
      min: [0, "Total salary cannot be negative"],
    },
    status: {
      type: String,
      enum: ["pending", "paid"],
      required: [true, "Status is required"],
      default: "pending",
    },
    payslipUrl: {
      // (Under Development)
      type: String,
    },

    paymentDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Salary = mongoose.model("Salary", salarySchema);

export default Salary;
