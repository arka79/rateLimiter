require("dotenv").config();

const express = require("express");
const connectDB = require("./mongo");
const rateLimiter = require("./rateLimiter");

const app = express();

app.use(express.json());

// Health check
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "MongoDB Rate Limiter is running"
    });
});

// Rate-limited test endpoint
app.get("/api/test", rateLimiter, (req, res) => {
    res.status(200).json({
        success: true,
        message: "Request allowed"
    });
});

// Start server
async function startServer() {
    try {
        await connectDB();

        app.listen(process.env.PORT || 5000, () => {
            console.log(
                `Server running on http://localhost:${process.env.PORT || 5000}`
            );
        });
    } catch (error) {
        console.error("Startup error:", error);
        process.exit(1);
    }
}

startServer();