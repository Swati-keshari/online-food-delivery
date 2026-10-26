import mongoose from "mongoose"
import Item from "../models/item.model.js"
import Shop from "../models/shop.model.js"
import User from "../models/user.model.js"
import { removeUploadedImage } from "../utils/uploads.js"

const parseJsonField = (value, fieldName) => {
    if (typeof value !== "string") return value
    try {
        return JSON.parse(value)
    } catch {
        throw new Error(`${fieldName} must be valid JSON.`)
    }
}

const parseAddressField = (value) => {
    if (typeof value !== "string") return value
    try {
        const parsed = JSON.parse(value)
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : value
    } catch {
        return value
    }
}

const getShopFields = (body) => {
    let address
    if (body.address !== undefined || body.city !== undefined || body.state !== undefined ||
        body.postalCode !== undefined || body.country !== undefined) {
        const submittedAddress = parseAddressField(body.address)
        address =
            submittedAddress && typeof submittedAddress === "object"
                ? { ...submittedAddress }
                : submittedAddress !== undefined
                    ? { street: submittedAddress }
                    : {}

        if (body.city !== undefined) address.city = body.city
        if (body.state !== undefined) address.state = body.state
        if (body.postalCode !== undefined) address.postalCode = body.postalCode
        if (body.country !== undefined) address.country = body.country
    }

    let location = parseJsonField(body.location, "location")
    if (!location && body.latitude !== undefined && body.longitude !== undefined) {
        if (body.latitude === "" || body.longitude === "") {
            throw new Error("latitude and longitude must be valid numbers.")
        }
        location = {
            type: "Point",
            coordinates: [Number(body.longitude), Number(body.latitude)],
        }
    }

    let cuisines = parseJsonField(body.cuisines, "cuisines")
    if (typeof cuisines === "string") {
        cuisines = cuisines.split(",").map((cuisine) => cuisine.trim()).filter(Boolean)
    }

    return {
        name: body.name,
        description: body.description,
        phone: body.phone,
        cuisines,
        address,
        location,
    }
}

const sendControllerError = (res, error, operation) => {
    if (error.code === 11000) {
        return res.status(409).json({ message: "A shop already exists for this owner." })
    }
    if (
        error instanceof mongoose.Error.ValidationError ||
        error.message.endsWith("must be valid JSON.") ||
        error.message === "latitude and longitude must be valid numbers."
    ) {
        return res.status(400).json({ message: error.message })
    }
    console.error(`${operation} error:`, error)
    return res.status(500).json({ message: `${operation} failed.` })
}

const ensureOwner = async (userId) => {
    const user = await User.findById(userId).select("role")
    return user?.role === "owner"
}

export const getMyShop = async (req, res) => {
    try {
        const isOwner = await ensureOwner(req.userId)
        if (!isOwner) {
            return res.status(403).json({ message: "Only shop owners can view their shop." })
        }

        // An owner can run several shops; oldest first so the first shop stays first.
        const ownerShops = await Shop.find({ owner: req.userId }).sort({ createdAt: 1 }).select("_id")

        for (const shop of ownerShops) {
            const itemIds = await Item.find({ shop: shop._id }).distinct("_id")
            if (itemIds.length > 0) {
                await Shop.updateOne(
                    { _id: shop._id },
                    { $addToSet: { items: { $each: itemIds } } },
                )
            }
        }

        const shops = await Shop.find({ owner: req.userId })
            .sort({ createdAt: 1 })
            .populate("owner", "fullName email mobile role")
            .populate("items")

        return res.status(200).json({ shops, shop: shops[0] ?? null })
    } catch (error) {
        console.error("Get owner shop error:", error)
        return res.status(500).json({ message: "Unable to load your shop." })
    }
}

const NEARBY_RADIUS_KM = 20
const EARTH_RADIUS_KM = 6378.1

const parseCoordinates = (latitude, longitude) => {
    if (latitude === undefined || longitude === undefined || latitude === "" || longitude === "") {
        return null
    }
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return null
    }
    return [lng, lat]
}

// City names from geocoders vary in spelling (e.g. "Ghaziyabad" vs "Ghaziabad"),
// so nearby shops are matched by location as well as by city name.
const findPublicShopsInCity = async (city, coordinates = null) => {
    const escapedCity = city
        .trim()
        .split(/\s+/)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("\\s+")
    const cityPattern = { $regex: `^\\s*${escapedCity}\\s*$`, $options: "i" }
    const conditions = [
        { "address.city": cityPattern },
        { city: cityPattern },
    ]
    if (coordinates) {
        conditions.push({
            location: {
                $geoWithin: { $centerSphere: [coordinates, NEARBY_RADIUS_KM / EARTH_RADIUS_KM] },
            },
        })
    }
    const filter = { $or: conditions }

    return Shop.find(filter)
        .select("name image description cuisines address isClosed")
        .populate({
            path: "items",
            match: { isAvailable: true },
            options: { sort: { createdAt: -1 } },
            select: "name image description price category foodType isAvailable rating createdAt",
        })
        .sort({ createdAt: -1 })
}

export const getPublicShops = async (req, res) => {
    try {
        const city = typeof req.query.city === "string" ? req.query.city.trim() : ""
        if (!city) {
            return res.status(400).json({ message: "City is required to find shops." })
        }

        const coordinates = parseCoordinates(req.query.lat, req.query.lng)
        const shops = await findPublicShopsInCity(city, coordinates)
        return res.status(200).json({ shops })
    } catch (error) {
        console.error("Get public shops error:", error)
        return res.status(500).json({ message: "Unable to load shops." })
    }
}

export const getShopByCity = async (req, res) => {
    try {
        const city = typeof req.params.city === "string" ? req.params.city.trim() : ""
        if (!city) {
            return res.status(400).json({ message: "City is required to find shops." })
        }

        const coordinates = parseCoordinates(req.query.lat, req.query.lng)
        const shops = await findPublicShopsInCity(city, coordinates)
        return res.status(200).json({ shops })
    } catch (error) {
        console.error("Get shops by city error:", error)
        return res.status(500).json({ message: "Unable to load shops for this city." })
    }
}

// Public shop page: the shop and its available menu.
export const getShopById = async (req, res) => {
    try {
        const { shopId } = req.params
        if (!mongoose.isValidObjectId(shopId)) {
            return res.status(400).json({ message: "Invalid shop." })
        }

        const shop = await Shop.findById(shopId)
            .select("name image description cuisines address isClosed")
            .populate({
                path: "items",
                match: { isAvailable: true },
                options: { sort: { createdAt: -1 } },
                select: "name image description price category foodType isAvailable rating createdAt",
            })
        if (!shop) {
            return res.status(404).json({ message: "Shop not found." })
        }
        return res.status(200).json({ shop })
    } catch (error) {
        console.error("Get shop error:", error)
        return res.status(500).json({ message: "Unable to load the shop." })
    }
}

export const createShop = async (req, res) => {
    const uploadedImage = req.file?.imageUrl ?? null
    let isImageSaved = false
    try {
        const isOwner = await ensureOwner(req.userId)
        if (!isOwner) {
            return res.status(403).json({ message: "Only shop owners can create a shop." })
        }
        if (!req.file) {
            return res.status(400).json({ message: "Shop image is required." })
        }

        let fields
        try {
            fields = getShopFields(req.body)
        } catch (error) {
            return res.status(400).json({ message: error.message })
        }

        fields.image = uploadedImage

        const shop = await Shop.create({
            ...fields,
            owner: req.userId,
        })
        isImageSaved = true

        await shop.populate("owner", "fullName email mobile role")

        return res.status(201).json({ message: "Shop created successfully.", shop })
    } catch (error) {
        return sendControllerError(res, error, "Create shop")
    } finally {
        // The upload is only kept if it ended up on a saved shop.
        if (!isImageSaved) await removeUploadedImage(uploadedImage)
    }
}

export const editShop = async (req, res) => {
    const uploadedImage = req.file?.imageUrl ?? null
    let isImageSaved = false
    try {
        if (!mongoose.isValidObjectId(req.params.shopId)) {
            return res.status(400).json({ message: "Invalid shop ID." })
        }

        const isOwner = await ensureOwner(req.userId)
        if (!isOwner) {
            return res.status(403).json({ message: "Only shop owners can edit a shop." })
        }

        const shop = await Shop.findOne({ _id: req.params.shopId, owner: req.userId })
        if (!shop) {
            return res.status(404).json({ message: "Shop not found." })
        }

        let fields
        try {
            fields = getShopFields(req.body)
        } catch (error) {
            return res.status(400).json({ message: error.message })
        }

        for (const [key, value] of Object.entries(fields)) {
            if (value !== undefined) {
                shop[key] =
                    key === "address" && shop.address
                        ? { ...shop.address.toObject(), ...value }
                        : value
            }
        }
        const previousImage = uploadedImage ? shop.image : null
        if (uploadedImage) {
            shop.image = uploadedImage
        }

        await shop.save()
        isImageSaved = true
        if (previousImage && previousImage !== shop.image) {
            await removeUploadedImage(previousImage)
        }
        await shop.populate("owner", "fullName email mobile role")
        await shop.populate("items")

        return res.status(200).json({ message: "Shop updated successfully.", shop })
    } catch (error) {
        return sendControllerError(res, error, "Update shop")
    } finally {
        if (!isImageSaved) await removeUploadedImage(uploadedImage)
    }
}
// Owner opens or closes a shop; a closed shop is shown as closed and takes no orders.
export const setShopClosed = async (req, res) => {
    try {
        const { shopId } = req.params
        if (!mongoose.isValidObjectId(shopId) || typeof req.body?.isClosed !== "boolean") {
            return res.status(400).json({ message: "Send the shop and whether it is closed." })
        }
        const shop = await Shop.findOneAndUpdate(
            { _id: shopId, owner: req.userId },
            { isClosed: req.body.isClosed },
            { new: true },
        )
            .populate("owner", "fullName email mobile role")
            .populate("items")
        if (!shop) {
            return res.status(404).json({ message: "Shop not found." })
        }
        return res.status(200).json({ message: shop.isClosed ? "Shop closed." : "Shop is open.", shop })
    } catch (error) {
        console.error("Set shop closed error:", error)
        return res.status(500).json({ message: "Unable to update the shop." })
    }
}
