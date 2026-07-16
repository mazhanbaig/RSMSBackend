const ResponseObj = require('../utils/ResponseObj');
const invoiceService = require('../services/invoiceService');

async function list(req, res) {
    try {
        const result = await invoiceService.findAllByUser(req.user.uid, req.query);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Invoices fetched', result.data));
    } catch (err) {
        console.error('invoiceController.list:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch invoices', null, err.message));
    }
}

async function getOne(req, res) {
    try {
        const result = await invoiceService.findById(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Invoice fetched', result.data));
    } catch (err) {
        console.error('invoiceController.getOne:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch invoice', null, err.message));
    }
}

async function create(req, res) {
    try {
        const result = await invoiceService.create(req.user.uid, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(201).json(ResponseObj(true, 'Invoice created', result.data));
    } catch (err) {
        console.error('invoiceController.create:', err);
        res.status(500).json(ResponseObj(false, 'Failed to create invoice', null, err.message));
    }
}

async function update(req, res) {
    try {
        const result = await invoiceService.update(req.user.uid, req.params.id, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Invoice updated', result.data));
    } catch (err) {
        console.error('invoiceController.update:', err);
        res.status(500).json(ResponseObj(false, 'Failed to update invoice', null, err.message));
    }
}

async function remove(req, res) {
    try {
        const result = await invoiceService.remove(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Invoice deleted'));
    } catch (err) {
        console.error('invoiceController.remove:', err);
        res.status(500).json(ResponseObj(false, 'Failed to delete invoice', null, err.message));
    }
}

module.exports = { list, getOne, create, update, remove };
