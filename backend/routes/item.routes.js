import express from "express"
import { addItem, deleteItem, editItem, getItemById, setItemAvailability } from "../controllers/item.controllers.js"
import isAuth from "../middleware/isAuth.js"
import uploadImage from "../middleware/uploadImage.js"

const itemRouter = express.Router()

const uploadItemImage = uploadImage("items")

itemRouter.post("/", isAuth, uploadItemImage, addItem)
itemRouter.get("/get-by-id/:itemId", isAuth, getItemById)
itemRouter.patch("/:itemId", isAuth, uploadItemImage, editItem)
itemRouter.delete("/:itemId", isAuth, deleteItem)
itemRouter.patch("/:itemId/availability", isAuth, setItemAvailability)

export default itemRouter
