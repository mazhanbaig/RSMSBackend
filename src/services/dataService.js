const { db } = require("../config/firebase");

/**
 * Fetch data from a Firebase RTDB path.
 * @param {string} path - Database path to read
 * @returns {Promise<*>} The value at the path, or null if not found
 */
async function getData(path) {
    const snapshot = await db.ref(path).get();
    return snapshot.exists() ? snapshot.val() : null;
}

/**
 * Write data to a Firebase RTDB path (replaces entire node).
 * @param {string} path - Database path to write to
 * @param {*} data - Data to write
 * @returns {Promise<void>}
 */
async function saveData(path, data) {
    await db.ref(path).set(data);
}

/**
 * Update specific fields at a Firebase RTDB path.
 * @param {string} path - Database path to update
 * @param {*} data - Partial data to merge
 * @returns {Promise<void>}
 */
async function updateData(path, data) {
    await db.ref(path).update(data);
}

/**
 * Delete a node from Firebase RTDB.
 * @param {string} path - Database path to remove
 * @returns {Promise<void>}
 */
async function deleteData(path) {
    await db.ref(path).remove();
}

module.exports = { getData, saveData, updateData, deleteData };
