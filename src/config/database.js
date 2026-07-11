const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

let prisma;

function getPrisma() {
    if (!prisma) {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
        const adapter = new PrismaPg(pool);
        prisma = new PrismaClient({ adapter });
    }
    return prisma;
}

/**
 * Resolve Firebase uid to Postgres User.id.
 * Shared across all entity services to avoid duplication.
 */
async function resolveUserId(uid) {
    const p = getPrisma();
    const user = await p.user.findUnique({ where: { uid } });
    return user ? user.id : null;
}

module.exports = { getPrisma, resolveUserId };
