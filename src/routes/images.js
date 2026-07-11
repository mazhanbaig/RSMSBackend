const express = require('express')
const router = express.Router()
const multer = require('multer')
const verifyUser = require('../middlewares/authMiddleware')
const { validateImageUpload, validateDeleteImage } = require('../middlewares/validate')
const imagesController = require('../controllers/imagesController')

const upload = multer({ storage: multer.memoryStorage() })

router.post('/addimages', verifyUser, validateImageUpload, upload.array('images', 10), imagesController.addImages)

router.delete('/deleteimage/:public_id', verifyUser, validateDeleteImage, imagesController.deleteImage)

module.exports = router