/**
 * Backfill Script — Firebase RTDB → Postgres (Neon)
 *
 * Reads every record from the current Firebase RTDB paths for each entity type
 * and writes them into the matching Prisma model. Read-only against Firebase,
 * write-only against Postgres. RTDB stays fully intact (rollback safety net).
 *
 * Idempotent: safe to re-run. Uses upsert for Users/Transactions (unique keys),
 * and deletes-then-recreates for all entity records to handle partial backfills.
 *
 * Usage: node scripts/backfillPostgres.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 30000 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const { db } = require('../src/config/firebase');

// ─── Helpers ─────────────────────────────────────────────────────────

function snapshotToArray(snapshot) {
    const data = snapshot.val();
    if (!data) return [];
    return Object.entries(data).map(([key, val]) => ({ key, val }));
}

function toDate(value) {
    if (!value) return undefined;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') return new Date(value);
    return undefined;
}

function toDecimal(value) {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
}

function str(value) {
    if (value === null || value === undefined) return null;
    return String(value);
}

function requiredStr(value, fallback = 'Unknown') {
    if (value === null || value === undefined || value === '') return fallback;
    return String(value);
}

// ─── User Backfill (upsert — safe to re-run) ─────────────────────────

async function backfillUsers() {
    console.log('\n--- Backfilling Users ---');
    const snapshot = await db.ref('users').get();
    const records = snapshotToArray(snapshot);
    console.log(`  Read ${records.length} users from Firebase`);

    let success = 0, failed = 0;

    for (const { key: uid, val } of records) {
        try {
            const name = str(val.name) || uid;
            const email = str(val.email) || `${uid}@placeholder.local`;

            // Create Organization (id = uid so User.orgId FK matches)
            await prisma.organization.upsert({
                where: { id: uid },
                update: { name },
                create: { id: uid, name },
            });

            // Read subscription data from Firebase
            const subSnapshot = await db.ref(`users/${uid}/subscription`).get();
            const subData = subSnapshot.exists() ? subSnapshot.val() : null;

            await prisma.user.upsert({
                where: { uid },
                update: {
                    name,
                    email,
                    photoURL: str(val.photoURL),
                    provider: str(val.provider),
                    subscriptionStatus: subData ? str(subData.status) : null,
                    subscriptionExpiry: subData ? toDate(subData.expiryDate) : null,
                },
                create: {
                    uid,
                    orgId: uid,
                    name,
                    email,
                    photoURL: str(val.photoURL),
                    provider: str(val.provider),
                    subscriptionStatus: subData ? str(subData.status) : null,
                    subscriptionExpiry: subData ? toDate(subData.expiryDate) : null,
                },
            });
            success++;
        } catch (err) {
            console.error(`  ✗ Failed user ${uid}: ${err.message}`);
            failed++;
        }
    }

    console.log(`  ✓ ${success} written, ${failed} failed`);
    return { entity: 'User', read: records.length, success, failed };
}

// ─── Entity Backfill (delete + recreate) ─────────────────────────────

async function backfillEntity(entityName, firebasePath, prismaModel, fieldMapper, deleteFilter) {
    console.log(`\n--- Backfilling ${entityName}s ---`);

    // Delete existing records for this entity type first (safe to re-run)
    const existingCount = await prismaModel.count();
    if (existingCount > 0) {
        console.log(`  Deleting ${existingCount} existing ${entityName}s before backfill...`);
        if (deleteFilter) {
            await prismaModel.deleteMany({ where: deleteFilter });
        } else {
            await prismaModel.deleteMany();
        }
    }

    const snapshot = await db.ref(firebasePath).get();
    const usersData = snapshot.val();
    if (!usersData) {
        console.log(`  Read 0 ${entityName}s from Firebase`);
        return { entity: entityName, read: 0, success: 0, failed: 0 };
    }

    let totalRead = 0, success = 0, failed = 0;

    for (const [uid, userRecords] of Object.entries(usersData)) {
        if (!userRecords || typeof userRecords !== 'object') continue;

        const prismaUser = await prisma.user.findUnique({ where: { uid } });
        if (!prismaUser) {
            console.warn(`  ⚠ Skipping records for unknown uid=${uid} — user not yet in Postgres`);
            continue;
        }

        for (const [recordId, record] of Object.entries(userRecords)) {
            totalRead++;
            try {
                const data = fieldMapper(record, recordId, prismaUser);
                await prismaModel.create({ data });
                success++;
            } catch (err) {
                console.error(`  ✗ Failed ${entityName} ${recordId} (uid=${uid}): ${err.message}`);
                failed++;
            }
        }
    }

    console.log(`  Read ${totalRead} ${entityName}s from Firebase`);
    console.log(`  ✓ ${success} written, ${failed} failed`);
    return { entity: entityName, read: totalRead, success, failed };
}

// ─── Transaction Backfill (upsert by txnRef) ─────────────────────────

async function backfillTransactions() {
    console.log('\n--- Backfilling Transactions ---');
    const snapshot = await db.ref('transactions').get();
    const usersData = snapshot.val();
    if (!usersData) {
        console.log('  Read 0 transactions from Firebase');
        return { entity: 'Transaction', read: 0, success: 0, failed: 0 };
    }

    let totalRead = 0, success = 0, failed = 0;

    for (const [uid, txnRecords] of Object.entries(usersData)) {
        if (!txnRecords || typeof txnRecords !== 'object') continue;

        const prismaUser = await prisma.user.findUnique({ where: { uid } });
        if (!prismaUser) {
            console.warn(`  ⚠ Skipping transactions for unknown uid=${uid}`);
            continue;
        }

        for (const [txnRef, record] of Object.entries(txnRecords)) {
            totalRead++;
            try {
                const gateway = str(record.paymentMethod) === 'easypaisa' ? 'easypaisa' : 'jazzcash';

                await prisma.transaction.upsert({
                    where: { txnRef },
                    update: {
                        status: str(record.status) || 'pending',
                        gateway,
                        gatewayResponse: str(record.gatewayResponse),
                        gatewayMessage: str(record.gatewayMessage),
                        settledAt: toDate(record.settledAt),
                        updatedAt: new Date(),
                    },
                    create: {
                        uid,
                        orgId: uid,
                        txnRef,
                        amount: toDecimal(record.amount) || 0,
                        status: str(record.status) || 'pending',
                        gateway,
                        description: str(record.description),
                        gatewayResponse: str(record.gatewayResponse),
                        gatewayMessage: str(record.gatewayMessage),
                        createdAt: toDate(record.createdAt) || new Date(),
                        settledAt: toDate(record.settledAt),
                        userId: prismaUser.id,
                    },
                });
                success++;
            } catch (err) {
                console.error(`  ✗ Failed transaction ${txnRef} (uid=${uid}): ${err.message}`);
                failed++;
            }
        }
    }

    console.log(`  Read ${totalRead} transactions from Firebase`);
    console.log(`  ✓ ${success} written, ${failed} failed`);
    return { entity: 'Transaction', read: totalRead, success, failed };
}

// ─── Field Mappers ───────────────────────────────────────────────────

function mapClient(record, recordId, prismaUser) {
    return {
        uid: prismaUser.uid,
        orgId: prismaUser.uid,
        name: requiredStr(record.name, 'Unnamed Client'),
        email: str(record.email),
        phone: str(record.phone),
        budgetMin: toDecimal(record.budgetMin),
        budgetMax: toDecimal(record.budgetMax),
        preferences: str(record.preferences),
        notes: str(record.notes),
        status: str(record.status),
        createdAt: toDate(record.createdAt) || new Date(),
        userId: prismaUser.id,
    };
}

function mapOwner(record, recordId, prismaUser) {
    return {
        uid: prismaUser.uid,
        orgId: prismaUser.uid,
        name: requiredStr(record.name, 'Unnamed Owner'),
        email: str(record.email),
        phone: str(record.phone),
        notes: str(record.notes),
        createdAt: toDate(record.createdAt) || new Date(),
        userId: prismaUser.id,
    };
}

function mapProperty(record, recordId, prismaUser) {
    return {
        uid: prismaUser.uid,
        orgId: prismaUser.uid,
        title: requiredStr(record.title, 'Unnamed Property'),
        description: str(record.description),
        price: toDecimal(record.price),
        status: str(record.status),
        images: record.images ? (typeof record.images === 'string' ? record.images : JSON.stringify(record.images)) : null,
        createdAt: toDate(record.createdAt) || new Date(),
        userId: prismaUser.id,
    };
}

function mapEvent(record, recordId, prismaUser) {
    return {
        uid: prismaUser.uid,
        orgId: prismaUser.uid,
        title: requiredStr(record.title, 'Unnamed Event'),
        description: str(record.description),
        startTime: toDate(record.date || record.startTime) || new Date(),
        createdAt: toDate(record.createdAt) || new Date(),
        userId: prismaUser.id,
    };
}

function mapTask(record, recordId, prismaUser) {
    return {
        uid: prismaUser.uid,
        orgId: prismaUser.uid,
        title: requiredStr(record.title, 'Unnamed Task'),
        description: str(record.description),
        priority: requiredStr(record.priority, 'medium'),
        completed: record.completed === true || record.completed === 'true',
        dueDate: toDate(record.dueDate),
        createdAt: toDate(record.createdAt) || new Date(),
        userId: prismaUser.id,
    };
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
    console.log('=== Backfill: Firebase RTDB → Postgres (Neon) ===');
    console.log(`Started: ${new Date().toISOString()}\n`);

    const results = [];

    // 1. Users (other entities depend on them)
    results.push(await backfillUsers());

    // 2. Entity records nested under users/{uid}/{records}
    //    Delete + recreate for idempotency (no natural unique key on these entities)
    results.push(await backfillEntity('Client', 'clients', prisma.client, mapClient));
    results.push(await backfillEntity('Owner', 'owners', prisma.owner, mapOwner));
    results.push(await backfillEntity('Property', 'properties', prisma.property, mapProperty));
    results.push(await backfillEntity('Event', 'events', prisma.event, mapEvent));
    results.push(await backfillEntity('Task', 'tasks', prisma.task, mapTask));

    // 3. Transactions (upsert by txnRef)
    results.push(await backfillTransactions());

    // ─── Summary ────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════');
    console.log('  BACKFILL SUMMARY');
    console.log('═══════════════════════════════════════════');
    let totalRead = 0, totalWritten = 0, totalFailed = 0;
    for (const r of results) {
        console.log(`  ${r.entity.padEnd(15)}: ${r.read} read → ${r.success} written, ${r.failed} failed`);
        totalRead += r.read;
        totalWritten += r.success;
        totalFailed += r.failed;
    }
    console.log('───────────────────────────────────────────');
    console.log(`  TOTAL              : ${totalRead} read → ${totalWritten} written, ${totalFailed} failed`);
    console.log('═══════════════════════════════════════════');
    console.log(`Finished: ${new Date().toISOString()}`);

    await prisma.$disconnect();
}

main().catch((err) => {
    console.error('Fatal error:', err);
    prisma.$disconnect().catch(() => {});
    process.exit(1);
});
