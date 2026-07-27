const ResponseObj = (success = false, message, data, meta) => {
    const obj = { success, message, data };
    if (meta) obj.meta = meta;
    return obj;
}

module.exports = ResponseObj