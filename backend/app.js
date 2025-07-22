import express from "express";
import dotenv from "dotenv"
import cookieParser from "cookie-parser";
import userRoute from "./routes/user.route.js"
import postRoute from "./routes/post.route.js"
import notificationRoute from "./routes/notification.route.js"
import cors from 'cors'
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: "./.env",
})

const app = express();
const port = process.env.PORT || 4000

//cors
const allowedOrigins = ["http://localhost:8000", "http://localhost:5173", "http://localhost:3001", "http://127.0.0.1:51290", "https://shade-rx.onrender.com"];
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true // Allow credentials
};

app.use(cors(corsOptions));


//middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Serve uploaded files locally (fallback when S3 not configured)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//api
app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/notification", notificationRoute);

//serving frontend
// Multiple path attempts for different deployment environments
import fs from 'fs';
const possiblePaths = [
    path.join(process.cwd(), 'frontend/dist'),
    path.join(__dirname, '../frontend/dist'),
    path.join(process.cwd(), 'dist'),
    path.join(__dirname, '../dist'),
    path.join(process.cwd(), 'src/frontend/dist')
];

let frontendDistPath = null;
let indexHtmlPath = null;

console.log('Searching for frontend in these paths:', possiblePaths);
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

// Find the correct path that exists
for (const testPath of possiblePaths) {
    const testIndexPath = path.join(testPath, 'index.html');
    try {
        if (fs.existsSync(testIndexPath)) {
            frontendDistPath = testPath;
            indexHtmlPath = testIndexPath;
            console.log('✅ Found frontend at:', frontendDistPath);
            break;
        } else {
            console.log('❌ Not found at:', testPath);
        }
    } catch (err) {
        console.log('❌ Error checking:', testPath, err.message);
    }
}

if (frontendDistPath) {
    app.use(express.static(frontendDistPath));
    app.get("*", (req, res) => {
        console.log('Serving index.html from:', indexHtmlPath);
        res.sendFile(indexHtmlPath);
    });
} else {
    console.error('🚨 Frontend dist folder not found in any location!');
    console.error('Searched paths:', possiblePaths);
    app.get("*", (req, res) => {
        res.status(404).json({ 
            error: 'Frontend build not found', 
            message: 'The frontend build files could not be located',
            searchedPaths: possiblePaths,
            cwd: process.cwd(),
            dirname: __dirname
        });
    });
}


//serving backend
app.listen(port, () => {
    console.log(`server listening on port ${port}`);

})

export default app;