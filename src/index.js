require('dotenv').config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const Sentry = require("@sentry/node");
const pino = require('pino-http')();
const { Redis } = require("@upstash/redis");
const { Ratelimit } = require("@upstash/ratelimit");

// ─── Sentry Initialization ───────────────────────────────────────────
// Enable Sentry only when SENTRY_DSN is set (production/staging).
// In development, all lines are no-ops and won't affect performance.
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
        maxBreadcrumbs: 50,
    });
    console.log('Sentry initialized');
} else {
    console.warn('Sentry: SENTRY_DSN not set — error monitoring disabled');
}

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
app.use("/api/clients", strictLimiter);
app.use("/api/owners", strictLimiter);
app.use("/api/properties", strictLimiter);
app.use("/api/events", strictLimiter);
app.use("/api/tasks", strictLimiter);

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

// ─── Sentry Error Handler (must be last) ─────────────────────────────
// Captures unhandled errors and sends them to Sentry when DSN is configured.
app.use((err, req, res, _next) => {
    if (process.env.SENTRY_DSN) {
        Sentry.captureException(err);
    }
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
        error: process.env.NODE_ENV === 'development' ? err.message : null,
    });
});

module.exports = app;
