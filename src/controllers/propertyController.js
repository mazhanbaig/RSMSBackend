const Sentry = require('@sentry/node');
const ResponseObj = require('../utils/ResponseObj');
const propertyService = require('../services/propertyService');

async function list(req, res) {
    try {
        const result = await propertyService.findAllByUser(req.user.uid);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Properties fetched', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('propertyController.list:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch properties', null, err.message));
    }
}

async function getOne(req, res) {
    try {
        const result = await propertyService.findById(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Property fetched', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('propertyController.getOne:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch property', null, err.message));
    }
}

async function create(req, res) {
    try {
        const result = await propertyService.create(req.user.uid, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(201).json(ResponseObj(true, 'Property created', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('propertyController.create:', err);
        res.status(500).json(ResponseObj(false, 'Failed to create property', null, err.message));
    }
}

async function update(req, res) {
    try {
        const result = await propertyService.update(req.user.uid, req.params.id, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Property updated', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('propertyController.update:', err);
        res.status(500).json(ResponseObj(false, 'Failed to update property', null, err.message));
    }
}

async function remove(req, res) {
    try {
        const result = await propertyService.remove(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Property deleted'));
    } catch (err) {
        Sentry.captureException(err);
        console.error('propertyController.remove:', err);
        res.status(500).json(ResponseObj(false, 'Failed to delete property', null, err.message));
    }
}

module.exports = { list, getOne, create, update, remove };
