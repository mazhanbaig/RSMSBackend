const { getPrisma, resolveUserId } = require('../config/database');

function requireRole(...allowedRoles) {
    return async function (req, res, next) {
        try {
            const prisma = getPrisma();
            const userId = await resolveUserId(req.user.uid);
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });

            if (!user || !allowedRoles.includes(user.role)) {
                return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
            }

            next();
        } catch (err) {
            console.error('requireRole error:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    };
}

function requireViewerReadOnly(req, res, next) {
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (writeMethods.includes(req.method)) {
        return requireRole('owner', 'agent')(req, res, next);
    }
    next();
}

module.exports = { requireRole, requireViewerReadOnly };
