const Sentry = require('@sentry/node');
const ResponseObj = require('../utils/ResponseObj');
const ownerService = require('../services/ownerService');

async function list(req, res) {
    try {
        const result = await ownerService.findAllByUser(req.user.uid);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Owners fetched', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('ownerController.list:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch owners', null, err.message));
    }
}

async function getOne(req, res) {
    try {
        const result = await ownerService.findById(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Owner fetched', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('ownerController.getOne:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch owner', null, err.message));
    }
}

async function create(req, res) {
    try {
        const result = await ownerService.create(req.user.uid, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(201).json(ResponseObj(true, 'Owner created', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('ownerController.create:', err);
        res.status(500).json(ResponseObj(false, 'Failed to create owner', null, err.message));
    }
}

async function update(req, res) {
    try {
        const result = await ownerService.update(req.user.uid, req.params.id, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Owner updated', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('ownerController.update:', err);
        res.status(500).json(ResponseObj(false, 'Failed to update owner', null, err.message));
    }
}

async function remove(req, res) {
    try {
        const result = await ownerService.remove(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Owner deleted'));
    } catch (err) {
        Sentry.captureException(err);
        console.error('ownerController.remove:', err);
        res.status(500).json(ResponseObj(false, 'Failed to delete owner', null, err.message));
    }
}

module.exports = { list, getOne, create, update, remove };
