const crypto = require('crypto');

class MemoryCache {
    constructor(ttlMs = 60000) {
        this.store = new Map();
        this.ttlMs = ttlMs;
    }

    key(prefix, args) {
        const raw = prefix + ':' + JSON.stringify(args);
        return crypto.createHash('md5').update(raw).digest('hex');
    }

    get(prefix, args) {
        const k = this.key(prefix, args);
        const entry = this.store.get(k);
        if (!entry) return undefined;
        if (Date.now() - entry.ts > this.ttlMs) {
            this.store.delete(k);
            return undefined;
        }
        return entry.value;
    }

    set(prefix, args, value) {
        const k = this.key(prefix, args);
        this.store.set(k, { value, ts: Date.now() });
    }

    invalidate(prefix) {
        for (const k of this.store.keys()) {
            if (k.startsWith(prefix + ':')) {
                this.store.delete(k);
            }
        }
    }

    invalidateAll() {
        this.store.clear();
    }

    size() {
        return this.store.size;
    }
}

const defaultCache = new MemoryCache();

module.exports = { MemoryCache, defaultCache };