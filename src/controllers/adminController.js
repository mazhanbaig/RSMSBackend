const Sentry = require('@sentry/node');
const ResponseObj = require('../utils/ResponseObj');
const adminService = require('../services/adminService');

async function listUsers(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await adminService.listUsers(page, limit);
        await adminService.logAdminAction(req.adminUserId, 'list_users', null, null, { page, limit }, req.ip);
        res.status(200).json(ResponseObj(true, 'Users fetched', result));
    } catch (err) {
        Sentry.captureException(err);
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
        Sentry.captureException(err);
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
        Sentry.captureException(err);
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
        Sentry.captureException(err);
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
        Sentry.captureException(err);
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
        Sentry.captureException(err);
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
        Sentry.captureException(err);
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
        Sentry.captureException(err);
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
        Sentry.captureException(err);
        console.error('adminController.systemHealth:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch system health', null, err.message));
    }
}

async function mfaStatus(req, res) {
    try {
        const { auth } = require('../config/firebase');
        let firebaseUser;
        try {
            firebaseUser = await auth.getUser(req.params.uid);
        } catch (fbErr) {
            return res.status(404).json(ResponseObj(false, 'Firebase user not found', null, fbErr.message));
        }
        const enrolledFactors = (firebaseUser.mfaInfo || []).map(f => ({
            factorId: f.uid,
            phoneNumber: f.phoneNumber,
            displayName: f.displayName,
            enrolledAt: f.enrollmentTime,
        }));
        await adminService.logAdminAction(req.adminUserId, 'viewed_mfa_status', 'User', req.params.uid, { mfaEnrolled: enrolledFactors.length > 0 }, req.ip);
        res.status(200).json(ResponseObj(true, 'MFA status fetched', {
            uid: req.params.uid,
            mfaEnrolled: enrolledFactors.length > 0,
            enrolledFactors,
        }));
    } catch (err) {
        Sentry.captureException(err);
        console.error('adminController.mfaStatus:', err);
        res.status(500).json(ResponseObj(false, 'Failed to fetch MFA status', null, err.message));
    }
}

module.exports = { listUsers, getUserDetail, listOrganizations, securityOverview, auditLog, vulnerabilities, suspendUser, unsuspendUser, systemHealth, mfaStatus };
