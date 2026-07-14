const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const requireSuperAdmin = require('../middlewares/requireSuperAdmin');
const adminController = require('../controllers/adminController');

// All admin routes require both auth verification AND super-admin check
router.use(verifyUser, requireSuperAdmin);

// 3.1 — Cross-organization visibility
router.get('/users', adminController.listUsers);
router.get('/users/:uid', adminController.getUserDetail);
router.get('/organizations', adminController.listOrganizations);

// 3.2 — Security dashboard
router.get('/security/overview', adminController.securityOverview);
router.get('/security/audit-log', adminController.auditLog);
router.get('/security/vulnerabilities', adminController.vulnerabilities);

// MFA management
router.get('/users/:uid/mfa-status', adminController.mfaStatus);

// 3.3 — User management
router.post('/users/:uid/suspend', adminController.suspendUser);
router.post('/users/:uid/unsuspend', adminController.unsuspendUser);

// 3.4 — System health
router.get('/system/health', adminController.systemHealth);

// Community moderation
router.post('/community/posts/:id/hide', verifyUser, requireSuperAdmin, adminController.hidePost);
router.post('/community/posts/:id/unhide', verifyUser, requireSuperAdmin, adminController.unhidePost);
router.get('/community/posts', verifyUser, requireSuperAdmin, adminController.listAllPosts);

// Platform overview
router.get('/property-shares/overview', verifyUser, requireSuperAdmin, adminController.propertySharesOverview);
router.get('/chat-threads/overview', verifyUser, requireSuperAdmin, adminController.chatThreadsOverview);

module.exports = router;
