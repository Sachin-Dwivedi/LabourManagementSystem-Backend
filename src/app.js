import express from "express";
import userRouter from "./routes/user.route.js";
import errorMiddleware from "./middlewares/error.js";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(cookieParser());


app.use(`/api/v1`, userRouter);
app.use(errorMiddleware);
export default app;
