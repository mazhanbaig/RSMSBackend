const asyncHandler = require('../middlewares/asyncHandler');
const ResponseObj = require('../utils/ResponseObj');
const analyticsService = require('../services/analyticsService');

const overview = asyncHandler(async (req, res) => {
    const result = await analyticsService.getOverview(req.user.uid);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Analytics overview', result.data));
});

const clientsByStage = asyncHandler(async (req, res) => {
    const result = await analyticsService.getClientsByStage(req.user.uid);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Clients by stage', result.data));
});

const propertiesTimeline = asyncHandler(async (req, res) => {
    const result = await analyticsService.getPropertiesTimeline(req.user.uid);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Properties timeline', result.data));
});

module.exports = { overview, clientsByStage, propertiesTimeline };