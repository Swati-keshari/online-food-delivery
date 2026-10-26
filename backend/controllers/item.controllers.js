import mongoose from "mongoose"
import Item from "../models/item.model.js"
import Shop from "../models/shop.model.js"
import { removeUploadedImage } from "../utils/uploads.js"

const getPopulatedShop = (shopId) =>
    Shop.findById(shopId)
        .populate("owner", "fullName email mobile role")
        .populate({
            path: "items",
            options: { sort: { createdAt: -1 } },
        })

const getOwnerShopIds = async (userId) =>
    (await Shop.find({ owner: userId }).select("_id")).map((shop) => shop._id)

// An owner can have several shops, so the item goes to the shop they chose.
// With only one shop, that shop is used when none is sent.
const findOwnerShopForNewItem = async (userId, shopId) => {
    if (shopId) {
        if (!mongoose.isValidObjectId(shopId)) return null
        return Shop.findOne({ _id: shopId, owner: userId })
    }
    const shops = await Shop.find({ owner: userId }).limit(2)
    return shops.length === 1 ? shops[0] : null
}

export const addItem = async (req, res) => {
    const uploadedImage = req.file?.imageUrl ?? null
    let isImageSaved = false
    try {
        const shop = await findOwnerShopForNewItem(req.userId, req.body.shopId)
        if (!shop) {
            return res.status(404).json({ message: "Choose one of your shops before adding menu items." })
        }

        const { name, description, price, category, foodType } = req.body
        if (!req.file) {
            return res.status(400).json({ message: "Item image is required." })
        }

        const item = await Item.create({
            name,
            description,
            price,
            category,
            foodType,
            image: uploadedImage,
            shop: shop._id,
        })
        isImageSaved = true

        await Shop.updateOne(
            { _id: shop._id },
            { $addToSet: { items: item._id } },
        )

        const populatedShop = await getPopulatedShop(shop._id)
        if (!populatedShop) {
            return res.status(404).json({ message: "Shop was not found after adding the item." })
        }

        return res.status(201).json({ message: "Item added successfully.", shop: populatedShop })
    } catch (error) {
        if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
            return res.status(400).json({ message: error.message })
        }

        console.error("Add item error:", error)
        return res.status(500).json({ message: "Unable to add the item." })
    } finally {
        if (!isImageSaved) await removeUploadedImage(uploadedImage)
    }
}

export const getItemById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.itemId)) {
            return res.status(400).json({ message: "Invalid item ID." })
        }

        const shopIds = await getOwnerShopIds(req.userId)
        const item = await Item.findOne({ _id: req.params.itemId, shop: { $in: shopIds } })
        if (!item) {
            return res.status(404).json({ message: "Item not found in your shop." })
        }

        return res.status(200).json({ item })
    } catch (error) {
        console.error("Get item error:", error)
        return res.status(500).json({ message: "Unable to get the item." })
    }
}

export const editItem = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.itemId)) {
            await removeUploadedImage(req.file?.imageUrl ?? null)
            return res.status(400).json({ message: "Invalid item ID." })
        }

        const shopIds = await getOwnerShopIds(req.userId)
        const item = await Item.findOne({ _id: req.params.itemId, shop: { $in: shopIds } })
        if (!item) {
            await removeUploadedImage(req.file?.imageUrl ?? null)
            return res.status(404).json({ message: "Item not found in your shop." })
        }

        const { name, description, price, category, foodType } = req.body
        for (const [field, value] of Object.entries({ name, description, price, category, foodType })) {
            if (value !== undefined) item[field] = value
        }
        const previousImage = req.file ? item.image : null
        if (req.file) item.image = req.file.imageUrl

        await item.save()
        if (previousImage && previousImage !== item.image) {
            await removeUploadedImage(previousImage)
        }

        const populatedShop = await getPopulatedShop(item.shop)
        return res.status(200).json({ message: "Item updated successfully.", shop: populatedShop })
    } catch (error) {
        await removeUploadedImage(req.file?.imageUrl ?? null)
        if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
            return res.status(400).json({ message: error.message })
        }

        console.error("Update item error:", error)
        return res.status(500).json({ message: "Unable to update the item." })
    }
}

export const deleteItem = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.itemId)) {
            return res.status(400).json({ message: "Invalid item ID." })
        }

        const shopIds = await getOwnerShopIds(req.userId)
        const item = await Item.findOneAndDelete({ _id: req.params.itemId, shop: { $in: shopIds } })
        if (!item) {
            return res.status(404).json({ message: "Item not found in your shop." })
        }

        await Shop.updateOne({ _id: item.shop }, { $pull: { items: item._id } })
        await removeUploadedImage(item.image)

        const populatedShop = await getPopulatedShop(item.shop)
        return res.status(200).json({ message: "Item deleted successfully.", shop: populatedShop })
    } catch (error) {
        console.error("Delete item error:", error)
        return res.status(500).json({ message: "Unable to delete the item." })
    }
}

export const createItem = addItem
// Owner marks an item in or out of stock; out-of-stock items disappear from the public menu.
export const setItemAvailability = async (req, res) => {
    try {
        const { itemId } = req.params
        if (!mongoose.isValidObjectId(itemId) || typeof req.body?.isAvailable !== "boolean") {
            return res.status(400).json({ message: "Send the item and whether it is available." })
        }
        const shopIds = await getOwnerShopIds(req.userId)
        const item = await Item.findOneAndUpdate(
            { _id: itemId, shop: { $in: shopIds } },
            { isAvailable: req.body.isAvailable },
            { new: true },
        )
        if (!item) {
            return res.status(404).json({ message: "Item not found in your shops." })
        }
        const populatedShop = await getPopulatedShop(item.shop)
        return res.status(200).json({
            message: item.isAvailable ? "Item is back in stock." : "Item marked out of stock.",
            shop: populatedShop,
        })
    } catch (error) {
        console.error("Set item availability error:", error)
        return res.status(500).json({ message: "Unable to update the item." })
    }
}
