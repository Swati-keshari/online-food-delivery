import mongoose from "mongoose"

const addressSchema = new mongoose.Schema(
  {
    street: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      default: "India",
      trim: true,
    },
  },
  { _id: false },
)

const shopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    cuisines: {
      type: [String],
      default: [],
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
      },
    ],
    address: {
      type: addressSchema,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (coordinates) =>
            coordinates.length === 2 &&
            coordinates[0] >= -180 &&
            coordinates[0] <= 180 &&
            coordinates[1] >= -90 &&
            coordinates[1] <= 90,
          message: "Location coordinates must be [longitude, latitude].",
        },
      },
    },
    // Unused: saved as false on every existing shop, so it cannot mean "open". See isClosed.
    isOpen: {
      type: Boolean,
      default: false,
    },
    // The owner closes the shop to stop taking orders for a while.
    isClosed: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
)

shopSchema.set("toJSON", { virtuals: true })

shopSchema.index({ location: "2dsphere" })

const Shop = mongoose.model("Shop", shopSchema)

export default Shop