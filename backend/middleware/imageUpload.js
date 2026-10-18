import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

export const uploadsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../uploads");

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      const error = new Error("Choose a JPEG, PNG, WebP, or GIF image.");
      error.status = 400;
      return callback(error);
    }
    callback(null, true);
  },
});

export function receiveImage(req, res, next) {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();

    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : error.status || 400;
    return res.status(status).json({
      message: status === 413 ? "Image must be 5 MB or smaller." : error.message,
    });
  });
}

function getImageExtension(file) {
  const { buffer, mimetype } = file;
  if (mimetype === "image/jpeg" && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return ".jpg";
  }
  if (
    mimetype === "image/png" &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return ".png";
  }
  if (mimetype === "image/webp" && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return ".webp";
  }
  if (
    mimetype === "image/gif" &&
    ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))
  ) {
    return ".gif";
  }

  const error = new Error("The selected file is not a valid supported image.");
  error.status = 400;
  throw error;
}

export async function saveUploadedImage(file) {
  if (!file) return { url: "", publicId: "" };

  const extension = getImageExtension(file);
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    const uploaded = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: process.env.CLOUDINARY_FOLDER || "smart-krishi/advisories", resource_type: "image" },
        (error, result) => error ? reject(error) : resolve(result)
      ).end(file.buffer);
    });
    if (!uploaded?.secure_url || !uploaded.public_id) {
      throw new Error("Cloudinary did not return a usable image URL and public ID.");
    }
    return { url: uploaded.secure_url, publicId: uploaded.public_id };
  }

  await mkdir(uploadsDirectory, { recursive: true });
  const filename = `${randomUUID()}${extension}`;
  await writeFile(resolve(uploadsDirectory, filename), file.buffer, { flag: "wx" });
  return { url: `/uploads/${filename}`, publicId: "" };
}

export async function deleteUploadedImage(imagePath, publicId = "") {
  if (publicId && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(`Cloudinary image cleanup failed: ${result.result}`);
    }
    return;
  }
  const match = typeof imagePath === "string"
    ? imagePath.match(/^\/uploads\/([0-9a-f-]+\.(?:jpg|png|webp|gif))$/i)
    : null;
  if (!match) return;

  try {
    await unlink(resolve(uploadsDirectory, match[1]));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
