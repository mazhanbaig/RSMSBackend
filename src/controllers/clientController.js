const asyncHandler = require('../middlewares/asyncHandler');
const ResponseObj = require('../utils/ResponseObj');
const clientService = require('../services/clientService');

const list = asyncHandler(async (req, res) => {
    const result = await clientService.findAllByUser(req.user.uid, req.query);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    const { data, total, page, limit } = result;
    res.status(200).json(ResponseObj(true, 'Clients fetched', data, { total, page, limit }));
});

const getOne = asyncHandler(async (req, res) => {
    const result = await clientService.findById(req.user.uid, req.params.id);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Client fetched', result.data));
});

const create = asyncHandler(async (req, res) => {
    const result = await clientService.create(req.user.uid, req.body);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(201).json(ResponseObj(true, 'Client created', result.data));
});

const update = asyncHandler(async (req, res) => {
    const result = await clientService.update(req.user.uid, req.params.id, req.body);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Client updated', result.data));
});

const updatePipelineStage = asyncHandler(async (req, res) => {
    const result = await clientService.updatePipelineStage(req.user.uid, req.params.id, req.body.pipelineStage);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Pipeline stage updated', result.data));
});

const remove = asyncHandler(async (req, res) => {
    const result = await clientService.remove(req.user.uid, req.params.id);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Client deleted'));
});

module.exports = { list, getOne, create, update, remove, updatePipelineStage };