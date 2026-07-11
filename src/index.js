require('dotenv').config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pino = require('pino-http')();
const { Redis } = require("@upstash/redis");
const { Ratelimit } = require("@upstash/ratelimit");

const paymentRoutes = require("./routes/payment");
const authRoutes = require("./routes/auth");
const dataRoutes = require("./routes/data");
const imageRoutes = require("./routes/images");

const app = express();

app.use(helmet());
app.use(pino);

app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://zstate.vercel.app'
    ],
    credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Rate Limiting ────────────────────────────────────────────────────
// Rate limiting uses Upstash Redis for shared state across Vercel serverless instances.
// If UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set, rate limiting
// falls back to in-memory (which won't work across serverless instances — a warning is logged).
//
// Global limiter: 100 requests per 15 min per IP UNLESS using Upstash Redis, where
// we use @upstash/ratelimit's sliding window (more accurate for serverless).

let globalLimiter, strictLimiter;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const globalRatelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '15 m'),
        prefix: "rsms:global",
    });

    const strictRatelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '15 m'),
        prefix: "rsms:strict",
    });

    globalLimiter = (req, res, next) => {
        globalRatelimit.limit(req.ip).then(({ success }) => {
            if (!success) {
                return res.status(429).json({ success: false, message: "Too many requests, please try again later" });
            }
            next();
        }).catch(() => next());
    };

    strictLimiter = (req, res, next) => {
        strictRatelimit.limit(req.ip).then(({ success }) => {
            if (!success) {
                return res.status(429).json({ success: false, message: "Too many requests, please try again later" });
            }
            next();
        }).catch(() => next());
    };

    console.log("Rate limiting: Using Upstash Redis (shared store for serverless)");
} else {
    // Fallback: in-memory store (NOT shared across Vercel instances — warn)
    console.warn("Rate limiting: UPSTASH_REDIS_REST_URL/REST_TOKEN not set — falling back to in-memory store. Rate limiting will NOT be shared across serverless instances.");

    const rateLimit = require("express-rate-limit");

    globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: "Too many requests, please try again later" },
    });

    strictLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 30,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: "Too many requests, please try again later" },
    });
}

app.use(globalLimiter);

// Stricter limiter for auth and data mutation endpoints
app.use("/api/auth", strictLimiter);
app.use("/api/data", strictLimiter);

// Payment routes get the default global limiter only (no special limiting per instructions)

app.use("/api/payment", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/images", imageRoutes);

module.exports = app;
