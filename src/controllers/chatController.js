const asyncHandler = require('../middlewares/asyncHandler');
const ResponseObj = require('../utils/ResponseObj');
const chatService = require('../services/chatService');

const startChat = asyncHandler(async (req, res) => {
    const result = await chatService.startChat(null, req.params.token, req.body.visitorId);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(201).json(ResponseObj(true, 'Chat started', result.data));
});

const listThreads = asyncHandler(async (req, res) => {
    const result = await chatService.listThreads(req.user.uid);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Chat threads fetched', result.data));
});

const convertToClient = asyncHandler(async (req, res) => {
    const result = await chatService.convertToClient(req.user.uid, req.params.id);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Visitor converted to client', result.data));
});

const getThread = asyncHandler(async (req, res) => {
    const result = await chatService.getThread(req.user.uid, req.params.id);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Chat thread fetched', result.data));
});

module.exports = { startChat, listThreads, convertToClient, getThread };