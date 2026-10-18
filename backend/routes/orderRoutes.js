import { Router } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.use(protect, authorize("buyer"));

router.get("/mine", async (req, res, next) => {
  try {
    const orders = await Order.find({ buyerId: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const reservedItems = [];
  try {
    const { items, delivery } = req.body;
    if (!Array.isArray(items) || items.length < 1 || items.length > 50) {
      return res.status(400).json({ message: "An order must contain between 1 and 50 items." });
    }

    const normalizedItems = new Map();
    for (const item of items) {
      if (
        !item ||
        !mongoose.isValidObjectId(item.productId) ||
        typeof item.quantityKg !== "number" ||
        !Number.isFinite(item.quantityKg) ||
        item.quantityKg < 0.1 ||
        item.quantityKg > 10000
      ) {
        return res.status(400).json({ message: "Each item needs a valid product and quantity of at least 0.1 kg." });
      }
      const productId = item.productId.toString();
      normalizedItems.set(
        productId,
        (normalizedItems.get(productId) || 0) + item.quantityKg
      );
    }

    if (
      !delivery ||
      typeof delivery.name !== "string" ||
      !delivery.name.trim() ||
      delivery.name.trim().length > 100 ||
      typeof delivery.phone !== "string" ||
      !delivery.phone.trim() ||
      delivery.phone.trim().length > 30 ||
      typeof delivery.address !== "string" ||
      !delivery.address.trim() ||
      delivery.address.trim().length > 500
    ) {
      return res.status(400).json({ message: "Enter a name, phone number, and delivery address." });
    }

    const orderItems = [];
    for (const [productId, quantityKg] of normalizedItems) {
      const product = await Product.findOneAndUpdate(
        {
          _id: productId,
          availableStatus: true,
          quantityKg: { $gte: quantityKg, $gt: 0 },
          farmer: { $ne: req.user._id },
        },
        { $inc: { quantityKg: -quantityKg } },
        { new: true, runValidators: true }
      );

      if (!product) {
        const exists = await Product.exists({ _id: productId });
        const error = new Error(
          exists
            ? "A product is unavailable or has insufficient stock. Refresh the marketplace and try again."
            : "A product in your cart is no longer available."
        );
        error.status = exists ? 409 : 404;
        throw error;
      }

      reservedItems.push({ productId: product._id, quantityKg });
      const pricePerKg = Number(product.pricePerKg);
      orderItems.push({
        productId: product._id,
        farmerId: product.farmer,
        name: product.name,
        image: product.image,
        pricePerKg,
        quantityKg,
        subtotal: Math.round(pricePerKg * quantityKg * 100) / 100,
      });
    }

    const totalAmount = Math.round(
      orderItems.reduce((total, item) => total + item.subtotal, 0) * 100
    ) / 100;

    const [order] = await Order.create([{
      buyerId: req.user._id,
      items: orderItems,
      totalAmount,
      currency: "NPR",
      paymentMethod: "demo",
      paymentStatus: "not_processed",
      delivery: {
        name: delivery.name.trim(),
        phone: delivery.phone.trim(),
        address: delivery.address.trim(),
      },
    }]);

    res.status(201).json({ order });
  } catch (error) {
    for (const item of reservedItems) {
      try {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { quantityKg: item.quantityKg } }
        );
      } catch (rollbackError) {
        console.error("Unable to restore stock after failed order:", rollbackError);
      }
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
});

export default router;
