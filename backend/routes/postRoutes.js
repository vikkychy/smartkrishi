import { Router } from "express";
import mongoose from "mongoose";
import Post from "../models/Post.js";
import { protect } from "../middleware/auth.js";
import { deleteUploadedImage, receiveImage, saveUploadedImage } from "../middleware/imageUpload.js";

const router = Router();
const authorFields = "name role";

function exactFilter(value) {
  const escaped = value.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}$`, "i");
}

router.get("/", async (req, res, next) => {
  try {
    const filters = {};
    const { crop, category, status } = req.query;
    if (typeof crop === "string" && crop.trim()) filters.cropAffected = exactFilter(crop);
    if (typeof category === "string" && category.trim()) filters.diseaseCategory = exactFilter(category);
    if (status && status !== "Open" && status !== "Resolved") {
      return res.status(400).json({ message: "Choose Open or Resolved status." });
    }
    if (status === "Open" || status === "Resolved") filters.status = status;
    const posts = await Post.find(filters)
      .populate("authorId", authorFields)
      .populate("comments.authorId", authorFields)
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ posts });
  } catch (error) {
    next(error);
  }
});

router.post("/", protect, receiveImage, async (req, res, next) => {
  let uploadedImage = "";
  let uploadedPublicId = "";
  try {
    const { title, description, cropAffected, symptoms, diseaseCategory, severity } = req.body;
    const uploaded = await saveUploadedImage(req.file);
    uploadedImage = uploaded.url;
    uploadedPublicId = uploaded.publicId;
    const post = await Post.create({
      authorId: req.user._id,
      farmerId: req.user.role === "farmer" ? req.user._id : null,
      title,
      description: typeof description === "string" && description.trim() ? description : symptoms,
      imageUrl: uploadedImage,
      imagePublicId: uploadedPublicId,
      cropAffected,
      symptoms,
      diseaseCategory,
      severity,
    });
    uploadedImage = "";
    uploadedPublicId = "";
    await post.populate("authorId", authorFields);
    res.status(201).json({ post });
  } catch (error) {
    if (uploadedImage) {
      try {
        await deleteUploadedImage(uploadedImage, uploadedPublicId);
      } catch (cleanupError) {
        console.error("Unable to clean up rejected community image:", cleanupError);
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

router.post("/:id/comments", protect, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!text || text.length > 2000) {
      return res.status(400).json({ message: "Reply must be between 1 and 2000 characters." });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Community post not found." });
    }

    post.comments.push({
      authorId: req.user._id,
      text,
      isSolution: true,
      expertVerified: ["expert", "admin"].includes(req.user.role),
    });
    await post.save();
    await post.populate([
      { path: "authorId", select: authorFields },
      { path: "comments.authorId", select: authorFields },
    ]);
    res.status(201).json({ post });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

router.patch("/:id/status", protect, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }
    if (!["Open", "Resolved"].includes(req.body.status)) {
      return res.status(400).json({ message: "Choose Open or Resolved status." });
    }
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Community post not found." });
    const isAuthor = post.authorId.equals(req.user._id);
    const isExpert = ["expert", "admin"].includes(req.user.role);
    if (!isAuthor && !isExpert) {
      return res.status(403).json({ message: "Only the post author or an expert can update its status." });
    }
    post.status = req.body.status;
    await post.save();
    await post.populate([
      { path: "authorId", select: authorFields },
      { path: "comments.authorId", select: authorFields },
    ]);
    res.json({ post });
  } catch (error) {
    next(error);
  }
});

export default router;
