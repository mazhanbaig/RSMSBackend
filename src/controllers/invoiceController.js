const asyncHandler = require('../middlewares/asyncHandler');
const ResponseObj = require('../utils/ResponseObj');
const invoiceService = require('../services/invoiceService');

const list = asyncHandler(async (req, res) => {
    const result = await invoiceService.findAllByUser(req.user.uid, req.query);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    const { data, total, page, limit } = result;
    res.status(200).json(ResponseObj(true, 'Invoices fetched', data, { total, page, limit }));
});

const getOne = asyncHandler(async (req, res) => {
    const result = await invoiceService.findById(req.user.uid, req.params.id);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Invoice fetched', result.data));
});

const create = asyncHandler(async (req, res) => {
    const result = await invoiceService.create(req.user.uid, req.body);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(201).json(ResponseObj(true, 'Invoice created', result.data));
});

const update = asyncHandler(async (req, res) => {
    const result = await invoiceService.update(req.user.uid, req.params.id, req.body);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Invoice updated', result.data));
});

const remove = asyncHandler(async (req, res) => {
    const result = await invoiceService.remove(req.user.uid, req.params.id);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Invoice deleted'));
});

module.exports = { list, getOne, create, update, remove };