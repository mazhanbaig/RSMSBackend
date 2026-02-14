const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const ResponseObj = require("../utils/ResponseObj");
const verifyUser = require("../middlewares/authMiddleware");

// ---------------- GET DATA ----------------
router.get("/", verifyUser, async (req, res) => {
    const { path } = req.query;

    if (!path) {
        return res.status(400).json(ResponseObj(false, "Missing 'path' in request body", null, null));
    }

    try {
        const snapshot = await db.ref(path).get();
        const data = snapshot.exists() ? snapshot.val() : null;
        res.status(200).json(ResponseObj(true, "Data fetched successfully", data));
    } catch (err) {
        console.error(err);
        res.status(500).json(ResponseObj(false, "Failed to fetch data", null, err.message));
    }
});

// ---------------- SAVE DATA ----------------
router.post("/", verifyUser, async (req, res) => {
    // FIX: Add this destructuring line (this should be line 23)
    const { path, data } = req.body;

    if (!path || !data) {
        return res.status(400).json(ResponseObj(false, "Missing 'path' or 'data' in request body", null, null));
    }
    try {
        await db.ref(path).set(data);
        res.status(201).json(ResponseObj(true, "Data saved successfully"));
    } catch (err) {
        console.error(err);
        res.status(500).json(ResponseObj(false, "Failed to save data", null, err.message));
    }
});

// ---------------- UPDATE DATA ----------------
router.put("/", verifyUser, async (req, res) => {
    const { path, data } = req.body;

    if (!path || !data) {
        return res.status(400).json(ResponseObj(false, "Missing 'path' or 'data' in request body", null, null));
    }

    try {
        await db.ref(path).update(data);
        res.status(200).json(ResponseObj(true, "Data updated successfully"));
    } catch (err) {
        console.error(err);
        res.status(500).json(ResponseObj(false, "Failed to update data", null, err.message));
    }
});

// ---------------- DELETE DATA ----------------
router.delete("/", verifyUser, async (req, res) => {
    const { path } = req.body;

    if (!path) {
        return res.status(400).json(ResponseObj(false, "Missing 'path' in request body", null, null));
    }

    try {
        await db.ref(path).remove();
        res.status(200).json(ResponseObj(true, "Data deleted successfully"));
    } catch (err) {
        console.error(err);
        res.status(500).json(ResponseObj(false, "Failed to delete data", null, err.message));
    }
});

module.exports = router;