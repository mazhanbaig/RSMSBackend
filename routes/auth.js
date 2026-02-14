const express = require("express");
const router = express.Router();
const { db, admin } = require("../config/firebase");
const ResponseObj = require("../utils/ResponseObj");
const verifyUser = require("../middlewares/authMiddleware");

// ---------------- LOGIN / SAVE USER ----------------
router.post("/", async (req, res) => {
    try {
        const { uid, name, email, picture } = req.user;

        await db.ref("users/" + uid).update({
            uid,
            name,
            email,
            photoURL: picture,
            provider: "google",
            createdAt: new Date().toISOString(),
        });

        res.status(200).json(
            ResponseObj(true, "User saved successfully", null, null)
        );
    } catch (err) {
        res.status(500).json(
            ResponseObj(false, "Failed to save user", null, err.message)
        );
    }
});

// ---------------- FORCE LOGOUT  ----------------
router.post("/logout", verifyUser, async (req, res) => {
    try {
        const uid = req.user.uid;

        await admin.auth().revokeRefreshTokens(uid);

        res.status(200).json(
            ResponseObj(true, "Logged out from all devices", null, null)
        );
    } catch (err) {
        res.status(500).json(
            ResponseObj(false, "Logout failed", null, err.message)
        );
    }
});

module.exports = router;
