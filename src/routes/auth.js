const express = require("express");
const router = express.Router();
const verifyUser = require("../middlewares/authMiddleware");
const { validateAuthData } = require("../middlewares/validate");
const authController = require("../controllers/authController");

// ---------------- LOGIN / SAVE USER ----------------
router.post("/", verifyUser, validateAuthData, authController.login);

// ---------------- FORCE LOGOUT ----------------------
router.post("/logout", verifyUser, authController.logout);

module.exports = router;
