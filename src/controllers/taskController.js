const asyncHandler = require('../middlewares/asyncHandler');
const ResponseObj = require('../utils/ResponseObj');
const taskService = require('../services/taskService');

const list = asyncHandler(async (req, res) => {
    const result = await taskService.findAllByUser(req.user.uid, req.query);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    const { data, total, page, limit } = result;
    res.status(200).json(ResponseObj(true, 'Tasks fetched', data, { total, page, limit }));
});

const getOne = asyncHandler(async (req, res) => {
    const result = await taskService.findById(req.user.uid, req.params.id);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Task fetched', result.data));
});

const create = asyncHandler(async (req, res) => {
    const result = await taskService.create(req.user.uid, req.body);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(201).json(ResponseObj(true, 'Task created', result.data));
});

const update = asyncHandler(async (req, res) => {
    const result = await taskService.update(req.user.uid, req.params.id, req.body);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Task updated', result.data));
});

const remove = asyncHandler(async (req, res) => {
    const result = await taskService.remove(req.user.uid, req.params.id);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Task deleted'));
});

module.exports = { list, getOne, create, update, remove };