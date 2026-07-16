const ResponseObj = require('../utils/ResponseObj');
const approvalService = require('../services/approvalService');

async function list(req, res) {
    try {
        const result = await approvalService.findAllByUser(req.user.uid, req.query);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Approval requests fetched', result.data));
    } catch (err) {
        console.error('approvalController.list:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch approval requests', null, err.message));
    }
}

async function pendingReviews(req, res) {
    try {
        const result = await approvalService.findPendingForReview(req.user.uid);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Pending reviews fetched', result.data));
    } catch (err) {
        console.error('approvalController.pendingReviews:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch pending reviews', null, err.message));
    }
}

async function getOne(req, res) {
    try {
        const result = await approvalService.findById(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Approval request fetched', result.data));
    } catch (err) {
        console.error('approvalController.getOne:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch approval request', null, err.message));
    }
}

async function create(req, res) {
    try {
        const result = await approvalService.create(req.user.uid, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(201).json(ResponseObj(true, 'Approval request created', result.data));
    } catch (err) {
        console.error('approvalController.create:', err);
        res.status(500).json(ResponseObj(false, 'Failed to create approval request', null, err.message));
    }
}

async function review(req, res) {
    try {
        const result = await approvalService.review(req.user.uid, req.params.id, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Approval request reviewed', result.data));
    } catch (err) {
        console.error('approvalController.review:', err);
        res.status(500).json(ResponseObj(false, 'Failed to review approval request', null, err.message));
    }
}

async function remove(req, res) {
    try {
        const result = await approvalService.remove(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Approval request deleted'));
    } catch (err) {
        console.error('approvalController.remove:', err);
        res.status(500).json(ResponseObj(false, 'Failed to delete approval request', null, err.message));
    }
}

module.exports = { list, pendingReviews, getOne, create, review, remove };
