const { defaultCache } = require('../utils/cache');

function cacheMiddleware(prefix, ttlMs) {
    const cache = defaultCache;
    const ttl = ttlMs || 60000;

    return function (req, res, next) {
        if (req.method !== 'GET') return next();

        const cacheKeyArgs = {
            url: req.originalUrl,
            userUid: req.user ? req.user.uid : undefined,
        };

        const cached = cache.get(prefix, cacheKeyArgs);
        if (cached !== undefined) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(cached);
        }

        res.setHeader('X-Cache', 'MISS');

        const originalJson = res.json.bind(res);
        res.json = function (body) {
            res.setHeader('X-Cache', 'STORE');
            cache.set(prefix, cacheKeyArgs, body);
            return originalJson(body);
        };

        next();
    };
}

module.exports = { cacheMiddleware };