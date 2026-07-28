const { Ratelimit } = require("@upstash/redis");
const { MemoryCache } = require("../utils/cache");

let redis, redisRatelimit, memoryCache;

async function initRateLimit() {
    try {
        redis = new (require("@upstash/redis"))({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        redisRatelimit = new (require("@upstash/ratelimit"))(redis);
        console.log("Rate limiting: Using Upstash Redis (shared store for serverless)");
    } catch (err) {
        console.warn("Rate limiting: UPSTASH_REDIS_REST_URL/REST_TOKEN not set — falling back to in-memory store. Rate limiting will NOT be shared across Vercel instances.");
        redis = null;
        redisRatelimit = null;
    }
    memoryCache = new MemoryCache();
}

async function rateLimitMiddleware({ prefix, limit, windowMs, strict = false, tracking = false }) {
    return async (req, res, next) => {
        let userId = "unknown";
        try {
            if (tracking && req.user?.uid) {
                userId = `user:${req.user.uid}`;
            } else {
                userId = req.ip || "unknown";
            }
            const key = `${prefix}:${userId}`;
            const result = redisRatelimit?.limit ? await redisRatelimit.limit({ redis: redis, limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`), key }) : null;

            if (result?.success || (!redisRatelimit && memoryCache.get(`rl:${prefix}`, userId))) {
                if (tracking && res.setHeader) {
                    res.setHeader('X-RateLimit-Limit', limit);
                    res.setHeader('X-RateLimit-Remaining', result?.remaining ?? "unknown");
                    res.setHeader('X-RateLimit-Reset', result?.reset ?? "unknown");
                }
                return next();
            }

            if (!redisRatelimit) {
                memoryCache.set(`rl:${prefix}`, userId, true);
            }

            return res.status(429).json({
                success: false,
                message: "Too many requests",
                data: null,
                error: null,
            });
        } catch (err) {
            console.error('Rate limit middleware error:', err);
            return next();
        }
    };
}

module.exports = {
    initRateLimit,
    rateLimitMiddleware,
};