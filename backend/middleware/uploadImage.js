import { unlink } from "node:fs/promises"
import { upload } from "./multer.js"
import { isCloudinaryConfigured, uploadFileToCloudinary } from "../utils/cloudinary.js"

// Accepts one "image" file and sets req.file.imageUrl. With Cloudinary configured the image is
// stored there (hosts like Render wipe local files on restart); otherwise, or if Cloudinary
// refuses it, the image stays in /uploads so saving a shop or item still works.
const uploadImage = (folder) => (req, res, next) => {
    upload.single("image")(req, res, async (error) => {
        if (error) {
            const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400
            return res.status(status).json({ message: error.message })
        }
        if (!req.file) return next()

        req.file.imageUrl = `/uploads/${req.file.filename}`
        if (isCloudinaryConfigured()) {
            try {
                req.file.imageUrl = await uploadFileToCloudinary(req.file.path, folder)
                await unlink(req.file.path).catch(() => {})
            } catch (uploadError) {
                console.error("Cloudinary upload failed, keeping the image locally:", uploadError.message || uploadError)
            }
        }
        return next()
    })
}

export default uploadImage
