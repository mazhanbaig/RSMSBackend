const { body, param, query, validationResult } = require("express-validator");
const ResponseObj = require("../utils/ResponseObj");

// Middleware to check validation results and return 400 if any errors
function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(
            ResponseObj(false, "Validation failed", null, errors.array().map(e => e.msg))
        );
    }
    next();
}

// ─── Data.js validators ──────────────────────────────────────────────
const validateDataPath = (value) => {
    if (!value || typeof value !== "string") {
        throw new Error("Path must be a non-empty string");
    }
    if (value.includes("..") || value.includes("//")) {
        throw new Error("Path traversal not allowed");
    }
    return true;
};

const validateGetData = [
    query("path")
        .exists().withMessage("Missing 'path' query parameter")
        .isString().withMessage("Path must be a string")
        .custom(validateDataPath),
    handleValidationErrors,
];

const validatePostData = [
    body("path")
        .exists().withMessage("Missing 'path'")
        .isString().withMessage("Path must be a string")
        .custom(validateDataPath),
    body("data")
        .exists().withMessage("Missing 'data'"),
    handleValidationErrors,
];

const validatePutData = [
    body("path")
        .exists().withMessage("Missing 'path'")
        .isString().withMessage("Path must be a string")
        .custom(validateDataPath),
    body("data")
        .exists().withMessage("Missing 'data'"),
    handleValidationErrors,
];

const validateDeleteData = [
    body("path")
        .exists().withMessage("Missing 'path'")
        .isString().withMessage("Path must be a string")
        .custom(validateDataPath),
    handleValidationErrors,
];

// ─── Images.js validators ─────────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_COUNT = 10;

const validateImageUpload = (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json(ResponseObj(false, "No files uploaded", null, "At least one file is required"));
    }

    if (req.files.length > MAX_FILE_COUNT) {
        return res.status(400).json(ResponseObj(false, "Too many files", null, `Maximum ${MAX_FILE_COUNT} files allowed`));
    }

    for (const file of req.files) {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return res.status(400).json(
                ResponseObj(false, "Invalid file type", null, `Only JPEG, PNG, WebP, GIF, and AVIF are allowed. Got: ${file.mimetype}`)
            );
        }
        if (file.size > MAX_FILE_SIZE) {
            return res.status(400).json(
                ResponseObj(false, "File too large", null, `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`)
            );
        }
    }

    next();
};

const validateDeleteImage = [
    param("public_id")
        .exists().withMessage("Missing public_id")
        .isString().withMessage("public_id must be a string")
        .trim()
        .notEmpty().withMessage("public_id cannot be empty"),
    handleValidationErrors,
];

// ─── Auth.js validators ───────────────────────────────────────────────
const validateAuthData = [
    body("uid")
        .exists().withMessage("Missing uid")
        .isString().withMessage("uid must be a string")
        .notEmpty().withMessage("uid cannot be empty"),
    body("email")
        .optional()
        .isEmail().withMessage("Invalid email format"),
    handleValidationErrors,
];

// ─── Payment.js validators ────────────────────────────────────────────
const PAYMENT_METHODS = ["jazzcash", "easypaisa"];

const validatePaymentData = [
    body("amount")
        .exists().withMessage("Missing 'amount'")
        .isFloat({ min: 0.01, max: 999999.99 }).withMessage("Amount must be a positive number between 0.01 and 999,999.99"),
    body("email")
        .exists().withMessage("Missing 'email'")
        .isEmail().withMessage("Invalid email format"),
    body("selectedPayment")
        .exists().withMessage("Missing 'selectedPayment'")
        .isString().withMessage("selectedPayment must be a string")
        .isIn(PAYMENT_METHODS).withMessage(`selectedPayment must be one of: ${PAYMENT_METHODS.join(", ")}`),
    handleValidationErrors,
];

module.exports = {
    validateGetData,
    validatePostData,
    validatePutData,
    validateDeleteData,
    validateImageUpload,
    validateDeleteImage,
    validateAuthData,
    validatePaymentData,
};
