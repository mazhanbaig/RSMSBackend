require('dotenv').config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pino = require('pino-http')();
const { Redis } = require("@upstash/redis");
const { Ratelimit } = require("@upstash/ratelimit");

const paymentRoutes = require("./routes/payment");
const paymentWebhookRoutes = require("./routes/paymentWebhook");
const authRoutes = require("./routes/auth");
const imageRoutes = require("./routes/images");
const clientRoutes = require("./routes/clients");
const ownerRoutes = require("./routes/owners");
const propertyRoutes = require("./routes/properties");
const eventRoutes = require("./routes/events");
const taskRoutes = require("./routes/tasks");
const toolsRoutes = require("./routes/tools");
const analyticsRoutes = require("./routes/analytics");
const invoiceRoutes = require("./routes/invoices");
const approvalRoutes = require("./routes/approvals");
const adminRoutes = require("./routes/admin");
const activityRoutes = require("./routes/activity");
const communityRoutes = require("./routes/community");
const shareRoutes = require("./routes/share");
const chatRoutes = require("./routes/chat");

const app = express();

app.use(helmet());
app.use(pino);

app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
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

let globalLimiter, strictLimiter, adminLimiter;

if (process.env.LIVE_TEST === 'true' && process.env.NODE_ENV !== 'production') {
    const rateLimit = require("express-rate-limit");
    globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10000, standardHeaders: true, legacyHeaders: false, message: { success: false, message: "Too many requests" } });
    strictLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10000, standardHeaders: true, legacyHeaders: false, message: { success: false, message: "Too many requests" } });
    adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10000, standardHeaders: true, legacyHeaders: false, message: { success: false, message: "Too many requests" } });
    console.log("Rate limiting: LIVE_TEST mode — limits raised to 10000/15min");
} else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
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

    const adminRatelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '15 m'),
        prefix: "rsms:admin",
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

    adminLimiter = (req, res, next) => {
        adminRatelimit.limit(req.ip).then(({ success }) => {
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

    adminLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: "Too many requests, please try again later" },
    });
}

app.use(globalLimiter);

// Stricter limiter for auth and data mutation endpoints
app.use("/api/auth", strictLimiter);
app.use("/api/clients", strictLimiter);
app.use("/api/owners", strictLimiter);
app.use("/api/properties", strictLimiter);
app.use("/api/events", strictLimiter);
app.use("/api/tasks", strictLimiter);
app.use("/api/activity", strictLimiter);

// Payment routes get the default global limiter only (no special limiting per instructions)

app.use("/api/payment", paymentRoutes);
app.use("/api/payment", paymentWebhookRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/owners", ownerRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/tools", toolsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/invoices", strictLimiter, invoiceRoutes);
app.use("/api/approvals", strictLimiter, approvalRoutes);
app.use("/api/admin", adminLimiter, adminRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/community", strictLimiter, communityRoutes);
app.use("/api", shareRoutes);
app.use("/api", chatRoutes);

// ─── Payload Too Large Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            message: 'Request body too large. Maximum size is 1MB.',
            data: null,
            error: null,
        });
    }
    next(err);
});

// ─── Global Error Handler ────────────────────────────────────────────
app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
        error: process.env.NODE_ENV === 'development' ? err.message : null,
    });
});

module.exports = app;
