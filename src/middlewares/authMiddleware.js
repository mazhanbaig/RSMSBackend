const { admin } = require("../config/firebase");
const ResponseObj = require("../utils/ResponseObj");

const verifyUser = async (req, res, next) => {
    try {
        const header = req.headers["authorization"];

        if (!header) {
            return res
                .status(401)
                .json(ResponseObj(false, "Unauthorized: No Authorization header", null, null));
        }

        // Expect format: "Bearer <token>"
        const tokenParts = header.split(" ");
        if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
            return res
                .status(401)
                .json(ResponseObj(false, "Unauthorized Access", null, null));
        }

        const token = tokenParts[1];

        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded;

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
            )    }
};

module.exports = verifyUser;
