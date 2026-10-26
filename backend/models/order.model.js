import mongoose from "mongoose"

const shopOrderItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    image: String,
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    // The customer's 1-5 star rating, given once after delivery.
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  { _id: false },
)

// One order can contain items from several shops; each shop gets its own part.
const shopOrderSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shopOrderItems: [shopOrderItemSchema],
    status: {
      type: String,
      enum: ["pending", "preparing", "out-for-delivery", "delivered", "cancelled"],
      default: "pending",
    },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryAssignment",
      default: null,
    },
    assignedDeliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deliveredAt: Date,
    review: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    ratedAt: Date,
  },
  { timestamps: true },
)

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "online"],
      required: true,
    },
    // COD becomes "paid" on delivery; online becomes "paid" after Razorpay verification,
    // and "refunded" if the customer cancels.
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    razorpayOrderId: {
      type: String,
      index: true,
    },
    razorpayPaymentId: String,
    deliveryAddress: {
      text: {
        type: String,
        required: true,
        trim: true,
      },
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponCode: String,
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    cancelledAt: Date,
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    shopOrder: [shopOrderSchema],
  },
  { timestamps: true },
)

const Order = mongoose.model("Order", orderSchema)

export default Order
