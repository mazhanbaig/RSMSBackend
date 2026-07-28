const asyncHandler = require('../middlewares/asyncHandler');
const ResponseObj = require('../utils/ResponseObj');
const activityService = require('../services/activityService');

const list = asyncHandler(async (req, res) => {
    const result = await activityService.findAllByUser(req.user.uid, req.query);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Activity logs fetched', { data: result.data, total: result.total }));
});

module.exports = { list };