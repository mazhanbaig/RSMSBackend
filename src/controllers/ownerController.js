const asyncHandler = require('../middlewares/asyncHandler');
const ResponseObj = require('../utils/ResponseObj');
const ownerService = require('../services/ownerService');

const list = asyncHandler(async (req, res) => {
    const result = await ownerService.findAllByUser(req.user.uid, req.query);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    const { data, total, page, limit } = result;
    res.status(200).json(ResponseObj(true, 'Owners fetched', data, { total, page, limit }));
});

const getOne = asyncHandler(async (req, res) => {
    const result = await ownerService.findById(req.user.uid, req.params.id);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Owner fetched', result.data));
});

const create = asyncHandler(async (req, res) => {
    const result = await ownerService.create(req.user.uid, req.body);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(201).json(ResponseObj(true, 'Owner created', result.data));
});

const update = asyncHandler(async (req, res) => {
    const result = await ownerService.update(req.user.uid, req.params.id, req.body);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Owner updated', result.data));
});

const remove = asyncHandler(async (req, res) => {
    const result = await ownerService.remove(req.user.uid, req.params.id);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Owner deleted'));
});

module.exports = { list, getOne, create, update, remove };