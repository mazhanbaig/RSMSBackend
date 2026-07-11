const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const ResponseObj = require("../utils/ResponseObj");
const verifyUser = require("../middlewares/authMiddleware");
const verifySubscription = require("../middlewares/subscription.middleware");
const {
    validateGetData,
    validatePostData,
    validatePutData,
    validateDeleteData,
} = require("../middlewares/validate");

// Conditional subscription check — only enforced when PAYMENTS_ENABLED=true
function withSubscriptionCheck(req, res, next) {
    if (process.env.PAYMENTS_ENABLED === "true") {
        return verifySubscription(req, res, next);
    }
    next();
}

// Allowed public read paths (no auth prefix required)
const PUBLIC_READ_PATHS = ["public_properties"];

/**
 * Validates that the requested path is owned by the authenticated user
 * or is an explicitly allowed public path.
 * Returns null if allowed, or a 403 ResponseObj if denied.
 */
function validateOwnership(req, path) {
    if (!path || typeof path !== "string") {
        return ResponseObj(false, "Invalid path", null, "Path must be a non-empty string");
    }

    // Block path traversal attacks
    if (path.includes("..") || path.includes("//")) {
        return ResponseObj(false, "Invalid path", null, "Path traversal not allowed");
    }

    const uid = req.user.uid;

    // Check if path is an allowed public read path (GET only — writes must use ownership scoping)
    for (const publicPath of PUBLIC_READ_PATHS) {
        if ((path === publicPath || path.startsWith(publicPath + "/")) && req.method === "GET") {
            return null;
        }
    }

    // For write operations, also allow public_inquiries
    if (path === "public_inquiries" || path.startsWith("public_inquiries/")) {
        if (req.method === "POST") return null; // Allow submitting inquiries
    }

    // Ownership check: path must start with `segment/uid` where segment is a known namespace
    const knownNamespaces = [
        "clients", "owners", "properties", "events",
        "notifications", "messages", "documents",
        "chatSessions", "chatMessages", "message_templates",
        "bulk_messages", "users", "tasks", "activityLog"
    ];

    const firstSegment = path.split("/")[0];
    const secondSegment = path.split("/")[1];

    if (!knownNamespaces.includes(firstSegment)) {
        return ResponseObj(false, "Forbidden", null, "Unknown data namespace");
    }

    if (secondSegment !== uid) {
        return ResponseObj(false, "Forbidden", null, "You can only access your own data");
    }

    return null; // allowed
}

// ---------------- GET DATA ----------------
router.get("/", verifyUser, withSubscriptionCheck, validateGetData, async (req, res) => {
    const { path } = req.query;
    if (!path) return res.status(400).json(ResponseObj(false, "Missing 'path'", null, null));

    const ownershipError = validateOwnership(req, path);
    if (ownershipError) return res.status(403).json(ownershipError);

    try {
        const snapshot = await db.ref(path).get();
        const data = snapshot.exists() ? snapshot.val() : null;
        res.status(200).json(ResponseObj(true, "Data fetched successfully", data));
    } catch (err) {
        console.error("GET error:", err);
        res.status(500).json(ResponseObj(false, "Failed to fetch data", null, err.message));
    }
});

// ---------------- SAVE DATA ----------------
router.post("/", verifyUser, withSubscriptionCheck, validatePostData, async (req, res) => {
    const { path, data } = req.body;
    if (!path || !data) return res.status(400).json(ResponseObj(false, "Missing 'path' or 'data'", null, null));

    const ownershipError = validateOwnership(req, path);
    if (ownershipError) return res.status(403).json(ownershipError);

    try {
        await db.ref(path).set(data);
        res.status(201).json(ResponseObj(true, "Data saved successfully", data));
    } catch (err) {
        console.error("POST error:", err);
        res.status(500).json(ResponseObj(false, "Failed to save data", null, err.message));
    }
});

// ---------------- UPDATE DATA ----------------
router.put("/", verifyUser, withSubscriptionCheck, validatePutData, async (req, res) => {
    const { path, data } = req.body;
    if (!path || !data) return res.status(400).json(ResponseObj(false, "Missing 'path' or 'data'", null, null));

    const ownershipError = validateOwnership(req, path);
    if (ownershipError) return res.status(403).json(ownershipError);

    try {
        await db.ref(path).update(data);
        res.status(200).json(ResponseObj(true, "Data updated successfully", data));
    } catch (err) {
        console.error("PUT error:", err);
        res.status(500).json(ResponseObj(false, "Failed to update data", null, err.message));
    }
});

// ---------------- DELETE DATA ----------------
router.delete("/", verifyUser, withSubscriptionCheck, validateDeleteData, async (req, res) => {
    const { path } = req.body;
    if (!path) return res.status(400).json(ResponseObj(false, "Missing 'path'", null, null));

    const ownershipError = validateOwnership(req, path);
    if (ownershipError) return res.status(403).json(ownershipError);

    try {
        await db.ref(path).remove();
        res.status(200).json(ResponseObj(true, "Data deleted successfully"));
    } catch (err) {
        console.error("DELETE error:", err);
        res.status(500).json(ResponseObj(false, "Failed to delete data", null, err.message));
    }
});

module.exports = router;