import app from "./app.js"
import {config} from "dotenv"
import connectdb from "./config/database.js"

config();
connectdb();

app.listen(process.env.PORT ,()=>{
    console.log("Server Listened on PORT :", process.env.PORT)
})