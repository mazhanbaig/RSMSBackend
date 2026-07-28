const asyncHandler = require('../middlewares/asyncHandler');
const ResponseObj = require('../utils/ResponseObj');
const propertyService = require('../services/propertyService');

const list = asyncHandler(async (req, res) => {
    const result = await propertyService.findAllByUser(req.user.uid, req.query);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    const { data, total, page, limit } = result;
    res.status(200).json(ResponseObj(true, 'Properties fetched', data, { total, page, limit }));
});

const getOne = asyncHandler(async (req, res) => {
    const result = await propertyService.findById(req.user.uid, req.params.id);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Property fetched', result.data));
});

const create = asyncHandler(async (req, res) => {
    const result = await propertyService.create(req.user.uid, req.body);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(201).json(ResponseObj(true, 'Property created', result.data));
});

const update = asyncHandler(async (req, res) => {
    const result = await propertyService.update(req.user.uid, req.params.id, req.body);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Property updated', result.data));
});

const remove = asyncHandler(async (req, res) => {
    const result = await propertyService.remove(req.user.uid, req.params.id);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Property deleted'));
});

const featureToggle = asyncHandler(async (req, res) => {
    const result = await propertyService.toggleFeatured(req.user.uid, req.params.id);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Property featured status toggled', result.data));
});

const updateCustomFields = asyncHandler(async (req, res) => {
    if (req.body && (typeof req.body !== 'object' || Array.isArray(req.body))) {
        return res.status(400).json(ResponseObj(false, 'Invalid request body: customFields must be a JSON object'));
    }
    const result = await propertyService.updateCustomFields(req.user.uid, req.params.id, req.body);
    if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
    res.status(200).json(ResponseObj(true, 'Custom fields updated', result.data));
});

module.exports = { list, getOne, create, update, remove, featureToggle, updateCustomFields };