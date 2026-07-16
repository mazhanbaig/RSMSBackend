const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const controller = require('../controllers/chatController');

// Public (visitor starts chat)
router.post('/public/property-view/:token/chat/start', controller.startChat);

// Authenticated (agent views/manages threads)
router.get('/chat-threads', verifyUser, controller.listThreads);
router.get('/chat-threads/:id', verifyUser, controller.getThread);
router.post('/chat-threads/:id/convert-to-client', verifyUser, controller.convertToClient);

module.exports = router;
