const mongoose = require("mongoose");

const LIMIT = 5;
const WINDOW_MS = 60 * 1000;

const rateLimitSchema = new mongoose.Schema({
    clientId: {
        type: String,
        required: true
    },
    windowStart: {
        type: Date,
        required: true
    },
    count: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        required: true
    }
});

rateLimitSchema.index(
    { clientId: 1, windowStart: 1 },
    { unique: true }
);

rateLimitSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

const RateLimit = mongoose.model("RateLimit", rateLimitSchema);

async function rateLimiter(req, res, next) {
    try {
        const clientId = req.ip || "unknown";

        const now = Date.now();

        // Calculate the current fixed window
        const windowNumber = Math.floor(now / WINDOW_MS);
        const windowStartMs = windowNumber * WINDOW_MS;
        const windowEndMs = windowStartMs + WINDOW_MS;

        const windowStart = new Date(windowStartMs);
        const expiresAt = new Date(windowEndMs);

        // Atomically increment or create the counter
        const record = await RateLimit.findOneAndUpdate(
            {
                clientId,
                windowStart
            },
            {
                $inc: { count: 1 },
                $setOnInsert: { expiresAt }
            },
            {
                upsert: true,
                new: true
            }
        );

        const remaining = Math.max(0, LIMIT - record.count);

        res.set("X-RateLimit-Limit", String(LIMIT));
        res.set("X-RateLimit-Remaining", String(remaining));
        res.set(
            "X-RateLimit-Reset",
            String(Math.ceil(windowEndMs / 1000))
        );

        if (record.count > LIMIT) {
            return res.status(429).json({
                success: false,
                message: "Rate limit exceeded. Try again in the next window.",
                limit: LIMIT,
                remaining: 0
            });
        }

        next();

    } catch (error) {
        console.error("Rate limiter error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

module.exports = rateLimiter;