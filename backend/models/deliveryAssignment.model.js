import mongoose from "mongoose"

// One assignment per shop part of an order: offered to nearby delivery boys,
// then taken by the first one who accepts.
const deliveryAssignmentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    shopOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    broadcastedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["broadcasted", "assigned", "completed"],
      default: "broadcasted",
    },
    acceptedAt: Date,
    completedAt: Date,
    // OTP emailed to the customer; the delivery boy enters it to finish the delivery.
    deliveryOtpHash: {
      type: String,
      select: false,
    },
    deliveryOtpExpiresAt: Date,
    deliveryOtpSentAt: Date,
    deliveryOtpAttempts: {
      type: Number,
      default: 0,
    },
    deliveryOtpSendCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
)

// A delivery boy carries one order at a time; the database enforces it even if two accepts race.
deliveryAssignmentSchema.index(
  { assignedTo: 1 },
  { unique: true, partialFilterExpression: { status: "assigned" }, name: "one_active_delivery_per_boy" },
)

const DeliveryAssignment = mongoose.model("DeliveryAssignment", deliveryAssignmentSchema)

export default DeliveryAssignment
