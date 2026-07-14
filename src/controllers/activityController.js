const Sentry = require('@sentry/node');
const ResponseObj = require('../utils/ResponseObj');
const activityService = require('../services/activityService');

async function list(req, res) {
    try {
        const result = await activityService.findAllByUser(req.user.uid, req.query);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Activity logs fetched', { data: result.data, total: result.total }));
    } catch (err) {
        Sentry.captureException(err);
        console.error('activityController.list:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch activity logs', null, err.message));
    }
}

module.exports = { list };
