import express from "express"
import { addAddress, deleteAddress, getCurrentUser, updateProfile, updateUserLocation } from "../controllers/user.controllers.js"
import isAuth from "../middleware/isAuth.js"

const userRouter = express.Router()

userRouter.get("/current-user", isAuth, getCurrentUser)
userRouter.post("/update-location", isAuth, updateUserLocation)
userRouter.patch("/profile", isAuth, updateProfile)
userRouter.post("/addresses", isAuth, addAddress)
userRouter.delete("/addresses/:addressId", isAuth, deleteAddress)

export default userRouter
