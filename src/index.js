import app from "./app.js";
import { config } from "dotenv";
import connectdb from "./config/database.js";
import { v2 as cloudinary } from "cloudinary";

config();
connectdb();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.listen(process.env.PORT, () => {
  console.log("Server listening on PORT:", process.env.PORT);
});
