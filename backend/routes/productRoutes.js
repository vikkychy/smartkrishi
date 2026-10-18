import { Router } from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import { authorize, protect } from "../middleware/auth.js";
import { deleteUploadedImage, receiveImage, saveUploadedImage } from "../middleware/imageUpload.js";

const router = Router();
const editableFields = ["name", "category", "pricePerKg", "quantityKg", "image", "location", "availableStatus"];

router.get("/", async (req, res, next) => {
  try {
    const { category, search, location } = req.query;
    const filter = { availableStatus: true, quantityKg: { $gt: 0 } };

    if (typeof category === "string" && category.trim()) {
      filter.category = category.trim();
    }
    if (typeof location === "string" && location.trim()) {
      filter.location = { $regex: location.trim(), $options: "i" };
    }
    if (typeof search === "string" && search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { category: { $regex: safeSearch, $options: "i" } },
        { location: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const products = await Product.find(filter)
      .populate("farmer", "name phone")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ products });
  } catch (error) {
    next(error);
  }
});

router.get("/mine", protect, authorize("farmer"), async (req, res, next) => {
  try {
    const products = await Product.find({ farmer: req.user._id }).sort({ createdAt: -1 });
    res.json({ products });
  } catch (error) {
    next(error);
  }
});

router.post("/", protect, authorize("farmer"), receiveImage, async (req, res, next) => {
  let uploadedImage = "";
  try {
    uploadedImage = await saveUploadedImage(req.file);
    const product = await Product.create({
      ...Object.fromEntries(
        Object.entries(req.body).filter(([key]) => editableFields.includes(key))
      ),
      ...(uploadedImage ? { image: uploadedImage } : {}),
      farmer: req.user._id,
    });
    uploadedImage = "";
    res.status(201).json({ product });
  } catch (error) {
    if (uploadedImage) {
      try {
        await deleteUploadedImage(uploadedImage);
      } catch (cleanupError) {
        console.error("Unable to clean up rejected product image:", cleanupError);
      }
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
});

router.put("/:id", protect, authorize("farmer"), receiveImage, async (req, res, next) => {
  let uploadedImage = "";
  let previousImage = "";
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }

    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => editableFields.includes(key))
    );
    if (req.file) {
      uploadedImage = await saveUploadedImage(req.file);
      updates.image = uploadedImage;
    }
    const existingProduct = req.file
      ? await Product.findOne({ _id: req.params.id, farmer: req.user._id }).select("image")
      : null;
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, farmer: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      if (uploadedImage) {
        try {
          await deleteUploadedImage(uploadedImage);
        } catch (cleanupError) {
          console.error("Unable to clean up rejected product image:", cleanupError);
        }
      }
      return res.status(404).json({ message: "Product not found or not owned by this farmer." });
    }
    if (existingProduct) previousImage = existingProduct.image;
    if (previousImage && uploadedImage) {
      try {
        await deleteUploadedImage(previousImage);
      } catch (error) {
        console.error("Unable to remove replaced product image:", error);
      }
    }
    uploadedImage = "";
    res.json({ product });
  } catch (error) {
    if (uploadedImage) {
      try {
        await deleteUploadedImage(uploadedImage);
      } catch (cleanupError) {
        console.error("Unable to clean up rejected product image:", cleanupError);
      }
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
});

router.delete("/:id", protect, authorize("farmer"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }

    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      farmer: req.user._id,
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found or not owned by this farmer." });
    }
    try {
      await deleteUploadedImage(product.image);
    } catch (error) {
      console.error("Unable to remove deleted product image:", error);
    }
    res.json({ message: "Product deleted successfully." });
  } catch (error) {
    next(error);
  }
});

export default router;
