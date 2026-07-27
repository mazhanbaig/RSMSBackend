const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

let prisma;

function getPrisma() {
    if (!prisma) {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, max: 10 });
        const adapter = new PrismaPg(pool);
        prisma = new PrismaClient({ adapter, log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'] });
    }
    return prisma;
}

const uidCache = new Map();
const CACHE_TTL = 60000;

async function resolveUserId(uid) {
    const cached = uidCache.get(uid);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.id;
    const p = getPrisma();
    const user = await p.user.findUnique({ where: { uid }, select: { id: true } });
    if (user) {
        uidCache.set(uid, { id: user.id, ts: Date.now() });
        return user.id;
    }
    return null;
}

function clearUidCache(uid) {
    uidCache.delete(uid);
}

process.on('SIGINT', async () => {
    if (prisma) await prisma.$disconnect();
    process.exit(0);
});

module.exports = { getPrisma, resolveUserId, clearUidCache };
