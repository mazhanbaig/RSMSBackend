const { getPrisma } = require('../config/database');
const ResponseObj = require('../utils/ResponseObj');
const adminService = require('../services/adminService');
const mfaService = require('../services/mfaService');

async function listUsers(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await adminService.listUsers(page, limit);
        await adminService.logAdminAction(req.adminUserId, 'list_users', null, null, { page, limit }, req.ip);
        res.status(200).json(ResponseObj(true, 'Users fetched', result));
    } catch (err) {
        console.error('adminController.listUsers:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch users', null, err.message));
    }
}

async function getUserDetail(req, res) {
    try {
        const result = await adminService.getUserDetail(req.params.uid);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        await adminService.logAdminAction(req.adminUserId, 'viewed_user', 'User', req.params.uid, null, req.ip);
        res.status(200).json(ResponseObj(true, 'User detail fetched', result.data));
    } catch (err) {
        console.error('adminController.getUserDetail:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch user detail', null, err.message));
    }
}

async function listOrganizations(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await adminService.listOrganizations(page, limit);
        await adminService.logAdminAction(req.adminUserId, 'list_organizations', null, null, { page, limit }, req.ip);
        res.status(200).json(ResponseObj(true, 'Organizations fetched', result));
    } catch (err) {
        console.error('adminController.listOrganizations:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch organizations', null, err.message));
    }
}

async function securityOverview(req, res) {
    try {
        const result = await adminService.getSecurityOverview();
        await adminService.logAdminAction(req.adminUserId, 'viewed_security_dashboard', null, null, null, req.ip);
        res.status(200).json(ResponseObj(true, 'Security overview fetched', result.data));
    } catch (err) {
        console.error('adminController.securityOverview:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch security overview', null, err.message));
    }
}

async function auditLog(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const filters = {
            adminId: req.query.adminId || null,
            action: req.query.action || null,
            startDate: req.query.startDate || null,
            endDate: req.query.endDate || null,
        };
        const result = await adminService.getAuditLog(page, limit, filters);
        await adminService.logAdminAction(req.adminUserId, 'viewed_audit_log', null, null, { page, limit, filters }, req.ip);
        res.status(200).json(ResponseObj(true, 'Audit log fetched', result));
    } catch (err) {
        console.error('adminController.auditLog:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch audit log', null, err.message));
    }
}

async function vulnerabilities(req, res) {
    try {
        const result = await adminService.getNpmAuditSummary();
        await adminService.logAdminAction(req.adminUserId, 'viewed_vulnerabilities', null, null, null, req.ip);
        res.status(200).json(ResponseObj(true, 'Vulnerability summary fetched', result.data));
    } catch (err) {
        console.error('adminController.vulnerabilities:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch vulnerabilities', null, err.message));
    }
}

async function suspendUser(req, res) {
    try {
        const { reason } = req.body;
        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            return res.status(400).json(ResponseObj(false, 'Reason is required and must be a non-empty string'));
        }
        const result = await adminService.suspendUser(req.params.uid, reason.trim(), req.adminUserId, req.ip);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'User suspended'));
    } catch (err) {
        console.error('adminController.suspendUser:', err);
        res.status(500).json(ResponseObj(false, 'Failed to suspend user', null, err.message));
    }
}

async function unsuspendUser(req, res) {
    try {
        const result = await adminService.unsuspendUser(req.params.uid, req.adminUserId, req.ip);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        res.status(200).json(ResponseObj(true, 'User unsuspended'));
    } catch (err) {
        console.error('adminController.unsuspendUser:', err);
        res.status(500).json(ResponseObj(false, 'Failed to unsuspend user', null, err.message));
    }
}

async function systemHealth(req, res) {
    try {
        const result = await adminService.getSystemHealth();
        await adminService.logAdminAction(req.adminUserId, 'viewed_system_health', null, null, null, req.ip);
        res.status(200).json(ResponseObj(true, 'System health fetched', result.data));
    } catch (err) {
        console.error('adminController.systemHealth:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch system health', null, err.message));
    }
}

async function mfaStatus(req, res) {
    try {
        const result = await mfaService.getStatus(req.params.uid);
        if (result.error) {
            return res.status(result.status).json(ResponseObj(false, result.error));
        }
        await adminService.logAdminAction(req.adminUserId, 'viewed_mfa_status', 'User', req.params.uid, result.data, req.ip);
        res.status(200).json(ResponseObj(true, 'MFA status fetched', {
            uid: req.params.uid,
            ...result.data,
        }));
    } catch (err) {
        console.error('adminController.mfaStatus:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch MFA status', null, err.message));
    }
}

async function enrollMfa(req, res) {
    try {
        const result = await mfaService.generateSecret(req.user.uid);
        if (result.error) {
            return res.status(result.status).json(ResponseObj(false, result.error));
        }
        await adminService.logAdminAction(req.adminUserId, 'mfa_enrollment_started', null, null, null, req.ip);
        res.status(200).json(ResponseObj(true, 'TOTP secret generated', result.data));
    } catch (err) {
        console.error('adminController.enrollMfa:', err);
        res.status(500).json(ResponseObj(false, 'Failed to start MFA enrollment', null, err.message));
    }
}

async function verifyMfaEnrollment(req, res) {
    try {
        const { token } = req.body;
        if (!token || typeof token !== 'string' || token.length !== 6) {
            return res.status(400).json(ResponseObj(false, 'A 6-digit numeric token is required'));
        }
        const result = await mfaService.verifyEnrollment(req.user.uid, token);
        if (result.error) {
            return res.status(result.status).json(ResponseObj(false, result.error));
        }
        await adminService.logAdminAction(req.adminUserId, 'mfa_enrollment_completed', null, null, null, req.ip);
        res.status(200).json(ResponseObj(true, 'MFA enrollment verified', result.data));
    } catch (err) {
        console.error('adminController.verifyMfaEnrollment:', err);
        res.status(500).json(ResponseObj(false, 'Failed to verify MFA enrollment', null, err.message));
    }
}

async function mfaSetupStatus(req, res) {
    try {
        const result = await mfaService.getStatus(req.user.uid);
        if (result.error) {
            return res.status(result.status).json(ResponseObj(false, result.error));
        }
        res.status(200).json(ResponseObj(true, 'TOTP setup status fetched', result.data));
    } catch (err) {
        console.error('adminController.mfaSetupStatus:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch TOTP setup status', null, err.message));
    }
}

async function hidePost(req, res) {
    try {
        const { reason } = req.body;
        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            return res.status(400).json(ResponseObj(false, 'Reason is required and must be a non-empty string'));
        }
        const result = await adminService.hideCommunityPost(req.adminUserId, req.params.id, reason.trim());
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        await adminService.logAdminAction(req.adminUserId, 'hide_community_post', 'CommunityPost', req.params.id, { reason }, req.ip);
        res.status(200).json(ResponseObj(true, 'Post hidden'));
    } catch (err) {
        console.error('adminController.hidePost:', err);
        res.status(500).json(ResponseObj(false, 'Failed to hide post', null, err.message));
    }
}

async function unhidePost(req, res) {
    try {
        const result = await adminService.unhideCommunityPost(req.adminUserId, req.params.id);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        await adminService.logAdminAction(req.adminUserId, 'unhide_community_post', 'CommunityPost', req.params.id, null, req.ip);
        res.status(200).json(ResponseObj(true, 'Post unhidden'));
    } catch (err) {
        console.error('adminController.unhidePost:', err);
        res.status(500).json(ResponseObj(false, 'Failed to unhide post', null, err.message));
    }
}

async function listAllPosts(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const filters = {
            scope: req.query.scope || null,
            orgId: req.query.orgId || null,
            includeHidden: req.query.includeHidden !== 'false',
        };
        const result = await adminService.listAllCommunityPosts(req.adminUserId, { ...filters, page, limit });
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        await adminService.logAdminAction(req.adminUserId, 'list_all_community_posts', null, null, { page, limit, filters }, req.ip);
        res.status(200).json(ResponseObj(true, 'Posts fetched', result));
    } catch (err) {
        console.error('adminController.listAllPosts:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch posts', null, err.message));
    }
}

async function propertySharesOverview(req, res) {
    try {
        const result = await adminService.getPropertySharesOverview(req.adminUserId);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        await adminService.logAdminAction(req.adminUserId, 'viewed_property_shares_overview', null, null, null, req.ip);
        res.status(200).json(ResponseObj(true, 'Property shares overview fetched', result.data));
    } catch (err) {
        console.error('adminController.propertySharesOverview:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch property shares overview', null, err.message));
    }
}

async function chatThreadsOverview(req, res) {
    try {
        const result = await adminService.getChatThreadsOverview(req.adminUserId);
        if (result.error) return res.status(result.status).json(ResponseObj(false, result.error));
        await adminService.logAdminAction(req.adminUserId, 'viewed_chat_threads_overview', null, null, null, req.ip);
        res.status(200).json(ResponseObj(true, 'Chat threads overview fetched', result.data));
    } catch (err) {
        console.error('adminController.chatThreadsOverview:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch chat threads overview', null, err.message));
    }
}

module.exports = { listUsers, getUserDetail, listOrganizations, securityOverview, auditLog, vulnerabilities, suspendUser, unsuspendUser, systemHealth, mfaStatus, hidePost, unhidePost, listAllPosts, propertySharesOverview, chatThreadsOverview, enrollMfa, verifyMfaEnrollment, mfaSetupStatus };
