const ResponseObj = require("../utils/ResponseObj");
const imagesService = require("../services/imagesService");

/**
 * POST /api/images/addimages — Upload multiple images to Cloudinary.
 */
async function addImages(req, res) {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json(ResponseObj(false, "No files uploaded", null, "No files attached"));
    }

    try {
        const urls = [];

        for (const file of req.files) {
            const result = await imagesService.uploadImage(file.buffer);
            urls.push(result);
        }

        res.status(201).json(ResponseObj(true, "Uploaded successfully", urls, null));
    } catch (error) {
        console.log(error);
        res.status(500).json(ResponseObj(false, "Upload failed", null, error.message));
    }
}

/**
 * DELETE /api/images/deleteimage/:public_id — Delete a single image from Cloudinary.
 */
async function deleteImage(req, res) {
    try {
        const { public_id } = req.params;

        const result = await imagesService.deleteImage(public_id);

        if (result.result !== "ok") {
            return res.status(400).json(
                ResponseObj(false, "Image not found", null, result)
            );
        }

        res.status(200).json(
            ResponseObj(true, "Image deleted successfully", result, null)
        );
    } catch (error) {
        console.log(error);
        res.status(500).json(
            ResponseObj(false, "Delete failed", null, error.message)
        );
    }
}

module.exports = { addImages, deleteImage };
