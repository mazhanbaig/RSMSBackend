const ResponseObj = require('../utils/ResponseObj');
const clientService = require('../services/clientService');

async function list(req, res) {
    try {
        const result = await clientService.findAllByUser(req.user.uid);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Clients fetched', result.data));
    } catch (err) {
        console.error('clientController.list:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch clients', null, err.message));
    }
}

async function getOne(req, res) {
    try {
        const result = await clientService.findById(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Client fetched', result.data));
    } catch (err) {
        console.error('clientController.getOne:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch client', null, err.message));
    }
}

async function create(req, res) {
    try {
        const result = await clientService.create(req.user.uid, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(201).json(ResponseObj(true, 'Client created', result.data));
    } catch (err) {
        console.error('clientController.create:', err);
        res.status(500).json(ResponseObj(false, 'Failed to create client', null, err.message));
    }
}

async function update(req, res) {
    try {
        const result = await clientService.update(req.user.uid, req.params.id, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Client updated', result.data));
    } catch (err) {
        console.error('clientController.update:', err);
        res.status(500).json(ResponseObj(false, 'Failed to update client', null, err.message));
    }
}

async function remove(req, res) {
    try {
        const result = await clientService.remove(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Client deleted'));
    } catch (err) {
        console.error('clientController.remove:', err);
        res.status(500).json(ResponseObj(false, 'Failed to delete client', null, err.message));
    }
}

module.exports = { list, getOne, create, update, remove };
