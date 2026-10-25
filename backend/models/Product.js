import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Product name is required."],
      trim: true,
      maxlength: 120,
    },
    category: {
      type: String,
      required: [true, "Category is required."],
      trim: true,
      maxlength: 60,
      index: true,
    },
    pricePerKg: {
      type: Number,
      required: [true, "Price per kg is required."],
      min: [0, "Price cannot be negative."],
    },
    quantityKg: {
      type: Number,
      required: [true, "Available quantity is required."],
      min: [0, "Quantity cannot be negative."],
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
    imagePublicId: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },
    location: {
      type: String,
      trim: true,
      required: [true, "Product location is required."],
      maxlength: 200,
    },
    availableStatus: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", category: "text", location: "text" });

const Product = mongoose.model("Product", productSchema);

export default Product;
