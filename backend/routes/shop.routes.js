import express from "express"
import { createShop, editShop, getMyShop, getPublicShops, getShopById, setShopClosed, getShopByCity } from "../controllers/shop.controllers.js"
import isAuth from "../middleware/isAuth.js"
import uploadImage from "../middleware/uploadImage.js"

const shopRouter = express.Router()

const uploadShopImage = uploadImage("shops")

shopRouter.get("/", getPublicShops)
shopRouter.get("/city/:city", getShopByCity)
shopRouter.get("/my-shop", isAuth, getMyShop)
shopRouter.get("/:shopId", getShopById)
shopRouter.post("/", isAuth, uploadShopImage, createShop)
shopRouter.patch("/:shopId", isAuth, uploadShopImage, editShop)
shopRouter.patch("/:shopId/closed", isAuth, setShopClosed)

export default shopRouter
