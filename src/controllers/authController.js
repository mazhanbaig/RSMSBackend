const ResponseObj = require("../utils/ResponseObj");
const authService = require("../services/authService");

/**
 * POST /api/auth/ — Save or update user record on login.
 */
async function login(req, res) {
    try {
        const { uid, name, email, picture } = req.user;

        await authService.saveUser(uid, name, email, picture);

        res.status(200).json(
            ResponseObj(true, "User saved successfully", null, null)
        );
    } catch (err) {
        res.status(500).json(
            ResponseObj(false, "Failed to save user", null, err.message)
        );
    }
}

/**
 * POST /api/auth/logout — Force logout from all devices.
 */
async function logout(req, res) {
    try {
        const uid = req.user.uid;

        await authService.revokeUserTokens(uid);

        res.status(200).json(
            ResponseObj(true, "Logged out from all devices", null, null)
        );
    } catch (err) {
        res.status(500).json(
            ResponseObj(false, "Logout failed", null, err.message)
        );
    }
}

/**
 * DELETE /api/auth/account — Delete user account and all associated data.
 * Removes user from Postgres (cascade deletes clients, owners, properties, etc.),
 * cleans up Firebase RTDB, and revokes Firebase Auth tokens.
 */
async function deleteAccount(req, res) {
    try {
        const uid = req.user.uid;

        await authService.deleteUser(uid);

        res.status(200).json(
            ResponseObj(true, "Account deleted successfully", null, null)
        );
    } catch (err) {
        console.error('deleteAccount error:', err);
        res.status(500).json(
            ResponseObj(false, "Failed to delete account", null, err.message)
        );
    }
}

module.exports = { login, logout, deleteAccount };
