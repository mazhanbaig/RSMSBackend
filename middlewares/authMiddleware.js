const admin = require("firebase-admin");
const ResponseObj = require('../utils/ResponseObj')

const verifyUser = async (req, res, next) => {
    try {
        const header = req.headers.Authorization;
        const token = header.split(" ")[1];
        if (!token) {
            return res.status(401).json(ResponseObj(false, "Unauthorized", null, null));
        }
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded;
        console.log(req)
        next();
    } catch (err) {
        return res.json(ResponseObj(false, "Unauthorized Access", null, err));
    }
};

module.exports = verifyUser;
