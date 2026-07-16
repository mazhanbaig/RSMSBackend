const ResponseObj = require('../utils/ResponseObj');
const chatService = require('../services/chatService');

async function startChat(req, res) {
    try {
        const result = await chatService.startChat(null, req.params.token, req.body.visitorId);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(201).json(ResponseObj(true, 'Chat started', result.data));
    } catch (err) {
        console.error('chatController.startChat:', err);
        res.status(500).json(ResponseObj(false, 'Failed to start chat', null, err.message));
    }
}

async function listThreads(req, res) {
    try {
        const result = await chatService.listThreads(req.user.uid);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Chat threads fetched', result.data));
    } catch (err) {
        console.error('chatController.listThreads:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch chat threads', null, err.message));
    }
}

async function convertToClient(req, res) {
    try {
        const result = await chatService.convertToClient(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Visitor converted to client', result.data));
    } catch (err) {
        console.error('chatController.convertToClient:', err);
        res.status(500).json(ResponseObj(false, 'Failed to convert visitor', null, err.message));
    }
}

async function getThread(req, res) {
    try {
        const result = await chatService.getThread(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Chat thread fetched', result.data));
    } catch (err) {
        console.error('chatController.getThread:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch chat thread', null, err.message));
    }
}

module.exports = { startChat, listThreads, convertToClient, getThread };
