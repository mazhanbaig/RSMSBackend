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

// ─── Entity validators ──────────────────────────────────────────────

const validateClientData = [
    body("name")
        .exists().withMessage("Missing 'name'")
        .isString().withMessage("Name must be a string")
        .trim()
        .notEmpty().withMessage("Name cannot be empty"),
    body("email")
        .optional()
        .isEmail().withMessage("Invalid email format"),
    body("phone")
        .optional()
        .isString().withMessage("Phone must be a string"),
    body("budgetMin")
        .optional()
        .isFloat({ min: 0 }).withMessage("budgetMin must be a positive number"),
    body("budgetMax")
        .optional()
        .isFloat({ min: 0 }).withMessage("budgetMax must be a positive number"),
    body("preferences")
        .optional()
        .isString().withMessage("Preferences must be a string"),
    body("notes")
        .optional()
        .isString().withMessage("Notes must be a string"),
    body("status")
        .optional()
        .isString().withMessage("Status must be a string"),
    handleValidationErrors,
];

const validateOwnerData = [
    body("name")
        .exists().withMessage("Missing 'name'")
        .isString().withMessage("Name must be a string")
        .trim()
        .notEmpty().withMessage("Name cannot be empty"),
    body("email")
        .optional()
        .isEmail().withMessage("Invalid email format"),
    body("phone")
        .optional()
        .isString().withMessage("Phone must be a string"),
    body("notes")
        .optional()
        .isString().withMessage("Notes must be a string"),
    handleValidationErrors,
];

const validatePropertyData = [
    body("title")
        .exists().withMessage("Missing 'title'")
        .isString().withMessage("Title must be a string")
        .trim()
        .notEmpty().withMessage("Title cannot be empty"),
    body("description")
        .optional()
        .isString().withMessage("Description must be a string"),
    body("price")
        .optional()
        .isFloat({ min: 0 }).withMessage("Price must be a positive number"),
    body("status")
        .optional()
        .isString().withMessage("Status must be a string"),
    body("images")
        .optional()
        .isString().withMessage("Images must be a string (JSON)"),
    handleValidationErrors,
];

const validateEventData = [
    body("title")
        .exists().withMessage("Missing 'title'")
        .isString().withMessage("Title must be a string")
        .trim()
        .notEmpty().withMessage("Title cannot be empty"),
    body("description")
        .optional()
        .isString().withMessage("Description must be a string"),
    body("startTime")
        .exists().withMessage("Missing 'startTime'")
        .isISO8601().withMessage("startTime must be a valid ISO 8601 date"),
    handleValidationErrors,
];

const validateTaskData = [
    body("title")
        .exists().withMessage("Missing 'title'")
        .isString().withMessage("Title must be a string")
        .trim()
        .notEmpty().withMessage("Title cannot be empty"),
    body("description")
        .optional()
        .isString().withMessage("Description must be a string"),
    body("priority")
        .optional()
        .isIn(["low", "medium", "high"]).withMessage("Priority must be one of: low, medium, high"),
    body("completed")
        .optional()
        .isBoolean().withMessage("Completed must be a boolean"),
    body("dueDate")
        .optional({ values: "null" })
        .isISO8601().withMessage("dueDate must be a valid ISO 8601 date"),
    body("clientId")
        .optional()
        .isString().withMessage("clientId must be a string"),
    body("propertyId")
        .optional()
        .isString().withMessage("propertyId must be a string"),
    handleValidationErrors,
];

// ─── Images validators ─────────────────────────────────────────────
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

// ─── Auth validators ───────────────────────────────────────────────
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

// ─── Payment validators ────────────────────────────────────────────
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

const validateInvoiceData = [
    body("title")
        .exists().withMessage("Missing 'title'")
        .isString().withMessage("Title must be a string")
        .trim()
        .notEmpty().withMessage("Title cannot be empty"),
    body("amount")
        .exists().withMessage("Missing 'amount'")
        .isFloat({ min: 0 }).withMessage("Amount must be a positive number"),
    body("commission")
        .optional()
        .isFloat({ min: 0 }).withMessage("Commission must be a positive number"),
    body("tax")
        .optional()
        .isFloat({ min: 0 }).withMessage("Tax must be a positive number"),
    body("status")
        .optional()
        .isIn(["draft", "sent", "paid", "cancelled"]).withMessage("Status must be one of: draft, sent, paid, cancelled"),
    body("dueDate")
        .optional({ values: "null" })
        .isISO8601().withMessage("dueDate must be a valid ISO 8601 date"),
    body("clientId")
        .optional()
        .isString().withMessage("clientId must be a string"),
    body("propertyId")
        .optional()
        .isString().withMessage("propertyId must be a string"),
    body("notes")
        .optional()
        .isString().withMessage("Notes must be a string"),
    handleValidationErrors,
];

module.exports = {
    validateClientData,
    validateOwnerData,
    validatePropertyData,
    validateEventData,
    validateTaskData,
    validateInvoiceData,
    validateImageUpload,
    validateDeleteImage,
    validateAuthData,
    validatePaymentData,
};
