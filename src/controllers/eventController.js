const Sentry = require('@sentry/node');
const ResponseObj = require('../utils/ResponseObj');
const eventService = require('../services/eventService');

async function list(req, res) {
    try {
        const result = await eventService.findAllByUser(req.user.uid);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Events fetched', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('eventController.list:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch events', null, err.message));
    }
}

async function getOne(req, res) {
    try {
        const result = await eventService.findById(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Event fetched', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('eventController.getOne:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch event', null, err.message));
    }
}

async function create(req, res) {
    try {
        const result = await eventService.create(req.user.uid, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(201).json(ResponseObj(true, 'Event created', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('eventController.create:', err);
        res.status(500).json(ResponseObj(false, 'Failed to create event', null, err.message));
    }
}

async function update(req, res) {
    try {
        const result = await eventService.update(req.user.uid, req.params.id, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Event updated', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('eventController.update:', err);
        res.status(500).json(ResponseObj(false, 'Failed to update event', null, err.message));
    }
}

async function remove(req, res) {
    try {
        const result = await eventService.remove(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Event deleted'));
    } catch (err) {
        Sentry.captureException(err);
        console.error('eventController.remove:', err);
        res.status(500).json(ResponseObj(false, 'Failed to delete event', null, err.message));
    }
}

module.exports = { list, getOne, create, update, remove };
