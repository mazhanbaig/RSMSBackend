const cloudinary = require('cloudinary').v2

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
})

/**
 * Upload an image buffer to Cloudinary.
 * @param {Buffer} fileBuffer - Raw image data
 * @returns {Promise<{url: string, public_id: string}>}
 */
async function uploadImage(fileBuffer) {
    const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            { folder: "ZStateImages" },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        ).end(fileBuffer);
    });

    return {
        url: result.secure_url,
        public_id: result.public_id,
    };
}

/**
 * Delete an image from Cloudinary by public_id.
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<object>} Cloudinary deletion result
 */
async function deleteImage(publicId) {
    return await cloudinary.uploader.destroy(publicId);
}

module.exports = { uploadImage, deleteImage };
