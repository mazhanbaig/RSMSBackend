const Sentry = require('@sentry/node');
const ResponseObj = require('../utils/ResponseObj');
const taskService = require('../services/taskService');

async function list(req, res) {
    try {
        const result = await taskService.findAllByUser(req.user.uid);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Tasks fetched', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('taskController.list:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch tasks', null, err.message));
    }
}

async function getOne(req, res) {
    try {
        const result = await taskService.findById(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Task fetched', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('taskController.getOne:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch task', null, err.message));
    }
}

async function create(req, res) {
    try {
        const result = await taskService.create(req.user.uid, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(201).json(ResponseObj(true, 'Task created', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('taskController.create:', err);
        res.status(500).json(ResponseObj(false, 'Failed to create task', null, err.message));
    }
}

async function update(req, res) {
    try {
        const result = await taskService.update(req.user.uid, req.params.id, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Task updated', result.data));
    } catch (err) {
        Sentry.captureException(err);
        console.error('taskController.update:', err);
        res.status(500).json(ResponseObj(false, 'Failed to update task', null, err.message));
    }
}

async function remove(req, res) {
    try {
        const result = await taskService.remove(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Task deleted'));
    } catch (err) {
        Sentry.captureException(err);
        console.error('taskController.remove:', err);
        res.status(500).json(ResponseObj(false, 'Failed to delete task', null, err.message));
    }
}

module.exports = { list, getOne, create, update, remove };
