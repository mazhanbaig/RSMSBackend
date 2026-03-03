const verifySubscription = (req, res, next) => {
    try {
        let user = req.user
        if (!user) {
            return res
                .status(400)
                .json(ResponseObj(false, "Unauthorized Access", null, "Unauthorized Access"));
        }
        let isActive = user.subscription.status == "active"
        let isexpired = user.subscription.expiredAt > new Date().toISOString()
        if (!isActive && isexpired) {
            return res
                .status(400)
                .json(ResponseObj(false, "Buy subscription first", null, "Buy subscription first"));
        }
        
        next()

    } catch (error) {
        return res
            .status(500)
            .json(ResponseObj(false, "Something went wrong", null, "Something went wrong"));
    }
}

module.exports = verifySubscription