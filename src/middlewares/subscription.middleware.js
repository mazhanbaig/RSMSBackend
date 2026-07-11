const { db } = require("../config/firebase");
const ResponseObj = require("../utils/ResponseObj");

const verifySubscription = async (req, res, next) => {
    try {
        if (!req.user) {
            return res
                .status(401)
                .json(ResponseObj(false, "Unauthorized Access", null, "Unauthorized Access"));
        }

        // Fetch the actual user record from DB (req.user is just the decoded token, no subscription data)
        const snapshot = await db.ref(`users/${req.user.uid}`).get();
        const userRecord = snapshot.exists() ? snapshot.val() : null;

        if (!userRecord) {
            return res
                .status(404)
                .json(ResponseObj(false, "User not found", null, "User record does not exist in database"));
        }

        const subscription = userRecord.subscription;
        if (!subscription) {
            return res
                .status(400)
                .json(ResponseObj(false, "Buy subscription first", null, "No subscription found"));
        }

        const isActive = subscription.status === "active";
        const isExpired = subscription.expiryDate && new Date(subscription.expiryDate) < new Date();

        if (!isActive || isExpired) {
            return res
                .status(400)
                .json(ResponseObj(false, "Buy subscription first", null, "Subscription is not active or has expired"));
        }

        next();
    } catch (error) {
        console.error("Subscription check error:", error);
        return res
            .status(500)
            .json(ResponseObj(false, "Something went wrong", null, "Something went wrong"));
    }
};

module.exports = verifySubscription;