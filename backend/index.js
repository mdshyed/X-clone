import app from "./app.js";
import connectDB from "./db/connectDB.js";
import dotenv from "dotenv"
dotenv.config({
    path: "./.env"
})

connectDB();