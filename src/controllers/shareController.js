const asyncHandler = require('../middlewares/asyncHandler');
const ResponseObj = require('../utils/ResponseObj');
const shareService = require('../services/shareService');

const createLink = asyncHandler(async (req, res) => {
    const result = await shareService.createShareLink(req.user.uid, req.params.id, req.body.sharedWithName);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(201).json(ResponseObj(true, 'Share link created', result.data));
});

const deactivateLink = asyncHandler(async (req, res) => {
    const result = await shareService.deactivateShareLink(req.user.uid, req.params.linkId);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Share link deactivated', result.data));
});

const getPublicPropertyView = asyncHandler(async (req, res) => {
    const result = await shareService.getShareLinkByToken(req.params.token);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Property view fetched', result.data));
});

const registerPublicVisitor = asyncHandler(async (req, res) => {
    const result = await shareService.registerVisitor(req.params.token, req.body);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(201).json(ResponseObj(true, 'Visitor registered', result.data));
});

const listForProperty = asyncHandler(async (req, res) => {
    const result = await shareService.getShareLinksByProperty(req.user.uid, req.params.id);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Share links fetched', result.data));
});

module.exports = { createLink, deactivateLink, getPublicPropertyView, registerPublicVisitor, listForProperty };