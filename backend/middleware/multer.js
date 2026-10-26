import multer from "multer"
import { randomUUID } from "node:crypto"
import { mkdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

export const uploadsDirectory = fileURLToPath(new URL("../public/uploads/", import.meta.url))
mkdirSync(uploadsDirectory, { recursive: true })

const supportedImageTypes = new Map([
    ["image/avif", ".avif"],
    ["image/gif", ".gif"],
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
])

export const upload = multer({
    storage: multer.diskStorage({
        destination: uploadsDirectory,
        filename: (req, file, callback) => {
            callback(null, `${randomUUID()}${supportedImageTypes.get(file.mimetype)}`)
        },
    }),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (req, file, callback) => {
        if (!supportedImageTypes.has(file.mimetype)) {
            callback(new Error("Only JPEG, PNG, WebP, GIF, and AVIF images are allowed."))
            return
        }
        callback(null, true)
    },
})
