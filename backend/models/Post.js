import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: [true, "Reply text is required."],
      trim: true,
      maxlength: 2000,
    },
    isSolution: { type: Boolean, default: true },
    expertVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    title: {
      type: String,
      required: [true, "Post title is required."],
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      required: [true, "Post description is required."],
      trim: true,
      maxlength: 5000,
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: "",
      validate: {
        validator: (value) => !value || /^https?:\/\//i.test(value) || /^\/uploads\/[0-9a-f-]+\.(?:jpg|png|webp|gif)$/i.test(value),
        message: "Image must be an http/https URL or an uploaded image path.",
      },
    },
    imagePublicId: { type: String, trim: true, default: "" },
    cropAffected: { type: String, trim: true, maxlength: 120, default: "" },
    symptoms: { type: String, trim: true, maxlength: 3000, default: "" },
    diseaseCategory: { type: String, trim: true, maxlength: 120, default: "Other", index: true },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["Open", "Resolved"],
      default: "Open",
      index: true,
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);

export default Post;
