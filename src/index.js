require('dotenv').config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require('compression');
const pino = require('pino-http')();

const requestId = require("./middlewares/requestId");
const { sanitizeBody } = require("./middlewares/sanitize");
const { cacheMiddleware } = require("./middlewares/cache");
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

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:", "res.cloudinary.com", "images.unsplash.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "https://*.vercel.app", "https://*.upstash.io", "https://api.resend.com"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
        },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginEmbedderPolicy: false,
}));
app.use(compression({ level: 6, threshold: 1024 }));
app.use(pino);

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3000',
        'https://zstate.vercel.app',
        'https://www.zstate.vercel.app',
    ];

// Enhanced CORS configuration with proper error handling
const corsOptionsConfig = {
    origin: (origin, cb) => {
        // Allow requests from the allowed origins
        if (!origin) {
            // For non-browser requests, allow (e.g., server-to-server)
            return cb(null, true);
        }
        
        if (ALLOWED_ORIGINS.includes(origin)) {
            return cb(null, true);
        }
        
        if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
            return cb(null, true);
        }
        
        // For security, reject with explicit error
        console.error(`CORS blocked: origin not allowed`, origin);
        return cb(new Error('CORS policy: origin not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-TOTP-Code', 'X-Requested-With', 'X-Request-Id'],
    maxAge: 86400,
};

app.use(cors(corsOptionsConfig));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(requestId);
app.use(sanitizeBody);

// ─── Rate Limiting ────────────────────────────────────────────────────
const { rateLimitMiddleware, initRateLimit } = require("./middlewares/rateLimit");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

(async () => {
    await initRateLimit();
})();

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    keyGenerator: (req) => ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests" },
    max: 100,
});

const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    keyGenerator: (req) => ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests - sensitive endpoint" },
    max: 30,
});

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    keyGenerator: (req) => ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests - admin endpoint" },
    max: 10,
});

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

// ─── Root / Health Redirect ───────────────────────────────────────
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "RSMS Backend API",
        data: {
            api: "/api/health",
            version: "1.0.0",
            timestamp: new Date().toISOString(),
        },
    });
});

// ─── 404 Handler ────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        data: null,
        error: null,
    });
});

// ─── Global Error Handler ────────────────────────────────────────────
app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: statusCode === 500 ? 'Internal server error' : err.message,
        data: null,
        error: process.env.NODE_ENV === 'development' ? err.message : null,
    });
});

module.exports = app;