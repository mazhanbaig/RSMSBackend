const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const controller = require('../controllers/communityController');

router.get('/posts', verifyUser, controller.listPosts);
router.get('/posts/:id', verifyUser, controller.getPost);
router.post('/posts', verifyUser, controller.createPost);
router.put('/posts/:id', verifyUser, controller.updatePost);
router.delete('/posts/:id', verifyUser, controller.deletePost);
router.get('/posts/:id/comments', verifyUser, controller.getComments);
router.post('/posts/:id/comments', verifyUser, controller.createComment);

module.exports = router;
