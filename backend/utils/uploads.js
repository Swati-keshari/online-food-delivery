import { unlink } from "node:fs/promises"
import { uploadsDirectory } from "../middleware/multer.js"
import { deleteFromCloudinary } from "./cloudinary.js"

// Deletes an image this app stored: a local "/uploads/<file>" or a vingo/ image on Cloudinary.
// Other external URLs and missing files are ignored.
export const removeUploadedImage = async (imagePath) => {
    if (imagePath?.startsWith("https://res.cloudinary.com/")) {
        try {
            await deleteFromCloudinary(imagePath)
        } catch (error) {
            console.error("Cloudinary cleanup error:", error)
        }
        return
    }
    if (!imagePath?.startsWith("/uploads/")) return
    const filename = imagePath.slice("/uploads/".length)
    if (!filename || filename !== filename.split(/[\\/]/).at(-1)) return

    try {
        await unlink(`${uploadsDirectory}${filename}`)
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error("Image cleanup error:", error)
        }
    }
}
