const ResponseObj = (success = false, message, data, error) => {
    return {
        success,
        message,
        data,
        error
    }
}

module.exports = ResponseObj