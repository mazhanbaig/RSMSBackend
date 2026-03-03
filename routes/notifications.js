// backend/routes/notifications.js
const express = require("express");
const router = express.Router();
const admin = require("../firebase");
const ResponseObj = require("../utils/ResponseObj")

router.post("/send", async (req, res) => {
    const { title, body, token } = req.body;

    const message = {
        notification: { title, body },
        token,
    };

    try {
        const response = await admin.messaging().send(message);
        res.status(200).json(ResponseObj(true, '', response, null));
    } catch (error) {
        console.error(error);
        res.status(500).json(ResponseObj(false, '', null, error.message));
    }
});

module.exports = router;