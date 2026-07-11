const express = require("express");
const router = express.Router();
const verifyUser = require("../middlewares/authMiddleware");
const {
    validateGetData,
    validatePostData,
    validatePutData,
    validateDeleteData,
} = require("../middlewares/validate");
const dataController = require("../controllers/dataController");

// ---------------- GET DATA ----------------
router.get("/", verifyUser, dataController.withSubscriptionCheck, validateGetData, dataController.getData);

// ---------------- SAVE DATA ----------------
router.post("/", verifyUser, dataController.withSubscriptionCheck, validatePostData, dataController.saveData);

// ---------------- UPDATE DATA ----------------
router.put("/", verifyUser, dataController.withSubscriptionCheck, validatePutData, dataController.updateData);

// ---------------- DELETE DATA ----------------
router.delete("/", verifyUser, dataController.withSubscriptionCheck, validateDeleteData, dataController.deleteData);

module.exports = router;