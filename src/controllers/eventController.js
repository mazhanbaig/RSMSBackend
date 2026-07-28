const asyncHandler = require('../middlewares/asyncHandler');
const ResponseObj = require('../utils/ResponseObj');
const eventService = require('../services/eventService');

const list = asyncHandler(async (req, res) => {
    const result = await eventService.findAllByUser(req.user.uid, req.query);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    const { data, total, page, limit } = result;
    res.status(200).json(ResponseObj(true, 'Events fetched', data, { total, page, limit }));
});

const getOne = asyncHandler(async (req, res) => {
    const result = await eventService.findById(req.user.uid, req.params.id);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Event fetched', result.data));
});

const create = asyncHandler(async (req, res) => {
    const result = await eventService.create(req.user.uid, req.body);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(201).json(ResponseObj(true, 'Event created', result.data));
});

const update = asyncHandler(async (req, res) => {
    const result = await eventService.update(req.user.uid, req.params.id, req.body);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Event updated', result.data));
});

const remove = asyncHandler(async (req, res) => {
    const result = await eventService.remove(req.user.uid, req.params.id);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Event deleted'));
});

module.exports = { list, getOne, create, update, remove };