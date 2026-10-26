import { v2 as cloudinary } from "cloudinary"

export const isCloudinaryConfigured = () => {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env
    return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET)
}

const configure = () => {
    if (!isCloudinaryConfigured()) {
        throw new Error("Cloudinary is not configured.")
    }
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    })
}

// Uploads a local image file into vingo/<folder> and returns its https URL.
export const uploadFileToCloudinary = async (filePath, folder) => {
    configure()
    const result = await cloudinary.uploader.upload(filePath, { folder: `vingo/${folder}`, resource_type: "image", timeout: 20000 })
    if (!result?.secure_url) {
        throw new Error("Cloudinary did not return an image URL.")
    }
    return result.secure_url
}

// Deletes an image this app uploaded (a vingo/ image in our own Cloudinary account); ignores other URLs.
export const deleteFromCloudinary = async (imageUrl) => {
    if (!isCloudinaryConfigured() || typeof imageUrl !== "string") return
    const prefix = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`
    if (!imageUrl.startsWith(prefix)) return
    // .../image/upload/v123/vingo/items/abc.jpg -> vingo/items/abc
    const publicId = imageUrl.slice(prefix.length).replace(/^v\d+\//, "").replace(/\.[a-z0-9]+$/i, "")
    if (!publicId.startsWith("vingo/")) return
    configure()
    await cloudinary.uploader.destroy(publicId)
}
