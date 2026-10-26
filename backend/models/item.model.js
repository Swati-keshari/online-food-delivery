import mongoose from "mongoose"

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "Snacks",
        "Main Course",
        "Desserts",
        "Pizza",
        "Burgers",
        "Sandwiches",
        "South Indian",
        "North Indian",
        "Chinese",
        "Fast Food",
        "Others",
      ],
    },
    foodType: {
      type: String,
      enum: ["veg", "non-veg"],
      default: "veg",
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  { timestamps: true },
)

const Item = mongoose.model("Item", itemSchema)

export default Item