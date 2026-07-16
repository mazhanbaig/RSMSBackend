const Sentry = require('@sentry/node');
const ResponseObj = require('../utils/ResponseObj');
const shareService = require('../services/shareService');

async function createLink(req, res) {
    try {
        const result = await shareService.createShareLink(req.user.uid, req.params.id, req.body.sharedWithName);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(201).json(ResponseObj(true, 'Share link created', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('shareController.createLink:', err);
        res.status(500).json(ResponseObj(false, 'Failed to create share link', null, err.message));
    }
}

async function deactivateLink(req, res) {
    try {
        const result = await shareService.deactivateShareLink(req.user.uid, req.params.linkId);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Share link deactivated', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('shareController.deactivateLink:', err);
        res.status(500).json(ResponseObj(false, 'Failed to deactivate share link', null, err.message));
    }
}

async function getPublicPropertyView(req, res) {
    try {
        const result = await shareService.getShareLinkByToken(req.params.token);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Property view fetched', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('shareController.getPublicPropertyView:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch property view', null, err.message));
    }
}

async function registerPublicVisitor(req, res) {
    try {
        const result = await shareService.registerVisitor(req.params.token, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(201).json(ResponseObj(true, 'Visitor registered', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('shareController.registerPublicVisitor:', err);
        res.status(500).json(ResponseObj(false, 'Failed to register visitor', null, err.message));
    }
}

async function listForProperty(req, res) {
    try {
        const result = await shareService.getShareLinksByProperty(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Share links fetched', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('shareController.listForProperty:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch share links', null, err.message));
    }
}

module.exports = { createLink, deactivateLink, getPublicPropertyView, registerPublicVisitor, listForProperty };
