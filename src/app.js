import express from "express";
import cors from "cors";
import helmet from "helmet";
import projectRouter from "./routes/project.routes.js";
import userRouter from "./routes/user.routes.js";
import labourerRouter from "./routes/labourer.routes.js";
import attendanceRouter from "./routes/attendance.routes.js";
import salaryRouter from "./routes/salary.routes.js";
import leaveRouter from "./routes/leave.routes.js";
import performanceRouter from "./routes/performance.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import errorMiddleware from "./middlewares/error.js";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: ["*"],
    credentials: true,
  })
);

app.use(helmet());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use(`/api/v1/users`, userRouter);
app.use(`/api/v1/labourers`, labourerRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/attendance", attendanceRouter);
app.use("/api/v1/salaries", salaryRouter);
app.use("/api/v1/leaves", leaveRouter);
app.use("/api/v1/performance", performanceRouter);
app.use("/api/v1/notifications", notificationRouter);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is Healthy",
  });
});

// Error Middleware
app.use(errorMiddleware);

export default app;
