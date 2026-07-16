const ResponseObj = require('../utils/ResponseObj');
const communityService = require('../services/communityService');

async function listPosts(req, res) {
    try {
        const result = await communityService.listPosts(req.user.uid, req.query);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Posts fetched', result.data));
    } catch (err) {
        console.error('communityController.listPosts:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch posts', null, err.message));
    }
}

async function getPost(req, res) {
    try {
        const result = await communityService.getPost(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Post fetched', result.data));
    } catch (err) {
        console.error('communityController.getPost:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch post', null, err.message));
    }
}

async function createPost(req, res) {
    try {
        const result = await communityService.createPost(req.user.uid, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(201).json(ResponseObj(true, 'Post created', result.data));
    } catch (err) {
        console.error('communityController.createPost:', err);
        res.status(500).json(ResponseObj(false, 'Failed to create post', null, err.message));
    }
}

async function createComment(req, res) {
    try {
        const result = await communityService.createComment(req.user.uid, req.params.id, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(201).json(ResponseObj(true, 'Comment created', result.data));
    } catch (err) {
        console.error('communityController.createComment:', err);
        res.status(500).json(ResponseObj(false, 'Failed to create comment', null, err.message));
    }
}

async function getComments(req, res) {
    try {
        const result = await communityService.getCommentsByPost(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Comments fetched', result.data));
    } catch (err) {
        console.error('communityController.getComments:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch comments', null, err.message));
    }
}

async function updatePost(req, res) {
    try {
        const result = await communityService.updatePost(req.user.uid, req.params.id, req.body);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Post updated', result.data));
    } catch (err) {
        console.error('communityController.updatePost:', err);
        res.status(500).json(ResponseObj(false, 'Failed to update post', null, err.message));
    }
}

async function deletePost(req, res) {
    try {
        const result = await communityService.deletePost(req.user.uid, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'Post deleted'));
    } catch (err) {
        console.error('communityController.deletePost:', err);
        res.status(500).json(ResponseObj(false, 'Failed to delete post', null, err.message));
    }
}

module.exports = { listPosts, getPost, createPost, createComment, getComments, updatePost, deletePost };
