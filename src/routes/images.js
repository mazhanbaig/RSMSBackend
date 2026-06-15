const express = require('express')
const router = express.Router()
const multer = require('multer')
const ResponseObj = require('../utils/ResponseObj')
const verifyUser = require('../middlewares/authMiddleware')
const cloudinary = require('cloudinary').v2

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
})

const upload = multer({ storage: multer.memoryStorage() })

router.post('/addimages', verifyUser, upload.array('images', 10), async (req, res) => {

    if (!req.files || req.files.length === 0) {
        return res.status(400).json(ResponseObj(false, "No files uploaded", null, "No files attached"))
    }

    try {
        let urls = []

        for (const file of req.files) {

            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { folder: "ZStateImages" },
                    (error, result) => {
                        if (error) reject(error)
                        else resolve(result)
                    }
                ).end(file.buffer)
            })

            urls.push({
                url: result.secure_url,
                public_id: result.public_id
            })
        }

        res.status(201).json(ResponseObj(true, "Uploaded successfully", urls, null))

    } catch (error) {
        console.log(error)
        res.status(500).json(ResponseObj(false, "Upload failed", null, error.message))
    }
})
// ---------------- DELETE IMAGE ----------------
router.delete('/deleteimage/:public_id', verifyUser, async (req, res) => {
    try {
        const { public_id } = req.params

        const result = await cloudinary.uploader.destroy(public_id)

        if (result.result !== "ok") {
            return res.status(400).json(
                ResponseObj(false, "Image not found", null, result)
            )
        }

        res.status(200).json(
            ResponseObj(true, "Image deleted successfully", result, null)
        )

    } catch (error) {
        console.log(error)
        res.status(500).json(
            ResponseObj(false, "Delete failed", null, error.message)
        )
    }
})


module.exports = router