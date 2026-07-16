const ResponseObj = require('../utils/ResponseObj');
const analyticsService = require('../services/analyticsService');

async function overview(req, res) {
    try {
        const result = await analyticsService.getOverview(req.user.uid);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Analytics overview', result.data));
    } catch (err) {
        console.error('analyticsController.overview:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch overview', null, err.message));
    }
}

async function clientsByStage(req, res) {
    try {
        const result = await analyticsService.getClientsByStage(req.user.uid);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Clients by stage', result.data));
    } catch (err) {
        console.error('analyticsController.clientsByStage:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch clients by stage', null, err.message));
    }
}

async function propertiesTimeline(req, res) {
    try {
        const result = await analyticsService.getPropertiesTimeline(req.user.uid);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Properties timeline', result.data));
    } catch (err) {
        console.error('analyticsController.propertiesTimeline:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch properties timeline', null, err.message));
    }
}

module.exports = { overview, clientsByStage, propertiesTimeline };
