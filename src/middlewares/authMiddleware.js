const { auth, firebaseInitialized, firebaseInitError, firebaseAuthError } = require("../config/firebase");
const ResponseObj = require("../utils/ResponseObj");
const { checkUserSuspended } = require("../services/adminService");

const verifyUser = async (req, res, next) => {
    try {
        if (!firebaseInitialized || !auth || typeof auth.verifyIdToken !== 'function') {
            const diag = {
                firebaseInitialized,
                authExists: !!auth,
                verifyIdTokenType: typeof auth?.verifyIdToken,
                initError: firebaseInitError || null,
                authError: firebaseAuthError || null,
            };
            console.error("Firebase auth not initialized", JSON.stringify(diag));
            return res
                .status(500)
                .json(ResponseObj(false, "Server configuration error", diag, null));
        }

        const header = req.headers["authorization"];

        if (!header) {
            return res
                .status(401)
                .json(ResponseObj(false, "Unauthorized: No Authorization header", null, null));
        }

        const tokenParts = header.split(" ");
        if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
            return res
                .status(401)
                .json(ResponseObj(false, "Unauthorized Access", null, null));
        }

        const token = tokenParts[1];

        const decoded = await auth.verifyIdToken(token);
        req.user = decoded;

        // Check if user is suspended — reject with clear message
        const isSuspended = await checkUserSuspended(decoded.uid);
        if (isSuspended) {
            return res
                .status(403)
                .json(ResponseObj(false, "Account suspended. Please contact support.", null, null));
        }

        next();
    } catch (err) {
        console.error("verifyUser error:", err);
        return res
            .status(401)
            .json(
                ResponseObj(
                    false,
                    "Unauthorized Access",
                    null,
                    process.env.NODE_ENV === "development" ? err.message : null
                )
            );
    }
};

module.exports = verifyUser;
