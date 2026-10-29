import { Router } from "express";
import { createHash, randomInt } from "node:crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = Router();
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const RESET_REQUEST_COOLDOWN_MS = 60 * 1000;
const RESET_REQUEST_MESSAGE = "If an account with that email exists, a password reset code will be sent.";

function createToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    location: user.location,
  };
}

function hashResetToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function createMailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !process.env.SMTP_FROM) {
    const error = new Error("Password reset email is not configured.");
    error.status = 503;
    throw error;
  }

  const port = Number(SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    const error = new Error("SMTP_PORT must be a valid port.");
    error.status = 503;
    throw error;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, phone, password, role, location } = req.body;

    if (!name || !password || (!email && !phone)) {
      return res.status(400).json({
        message: "Name, password, and an email address or phone number are required.",
      });
    }

    if (role && !["farmer", "buyer"].includes(role)) {
      return res.status(400).json({ message: "Choose farmer or buyer as the account role." });
    }

    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : undefined;
    const normalizedPhone = typeof phone === "string" ? phone.trim() : undefined;
    const duplicate = await User.findOne({
      $or: [
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      ],
    });

    if (duplicate) {
      return res.status(409).json({ message: "An account with that email or phone already exists." });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      phone: normalizedPhone,
      password,
      role: role || "buyer",
      location,
    });

    return res.status(201).json({
      token: createToken(user._id.toString()),
      user: publicUser(user),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with that email or phone already exists." });
    }
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: "Email/phone and password are required." });
    }

    const normalizedIdentifier = identifier.trim();
    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier.toLowerCase() },
        { phone: normalizedIdentifier },
      ],
    }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Email/phone or password is incorrect." });
    }

    return res.json({
      token: createToken(user._id.toString()),
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const transport = createMailTransport();
    const user = await User.findOne({ email }).select(
      "+passwordResetRequestedAt +passwordResetTokenHash +passwordResetExpiresAt"
    );
    if (!user) {
      return res.json({ message: RESET_REQUEST_MESSAGE });
    }

    const now = Date.now();
    if (
      user.passwordResetRequestedAt &&
      now - user.passwordResetRequestedAt.getTime() < RESET_REQUEST_COOLDOWN_MS
    ) {
      return res.json({ message: RESET_REQUEST_MESSAGE });
    }

    const otp = String(randomInt(100000, 1000000));
    user.passwordResetTokenHash = hashResetToken(otp);
    user.passwordResetExpiresAt = new Date(now + RESET_TOKEN_TTL_MS);
    user.passwordResetRequestedAt = new Date(now);
    await user.save();

    try {
      await transport.sendMail({
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: "Your Smart Krishi password reset code",
        text: `Your password reset code is ${otp}. It expires in 15 minutes.\n\nIf you did not request this, you can ignore this email.`,
        html: `<p>Your Smart Krishi password reset code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p><p>This code expires in 15 minutes.</p><p>If you did not request this, you can ignore this email.</p>`,
      });
    } catch (error) {
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpiresAt = undefined;
      user.passwordResetRequestedAt = undefined;
      await user.save();
      console.error("Password reset email delivery failed:", error);
      return res.status(503).json({ message: "We couldn't send the reset email. Please try again later." });
    }

    res.json({ message: RESET_REQUEST_MESSAGE });
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, email, otp, password } = req.body;
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    let resetFilter;
    if (typeof token === "string") {
      if (!/^[a-f0-9]{64}$/i.test(token)) {
        return res.status(400).json({ message: "This reset link is invalid or has expired." });
      }
      resetFilter = { passwordResetTokenHash: hashResetToken(token) };
    } else {
      const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
      if (!normalizedEmail || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
        return res.status(400).json({ message: "Enter a valid email address and 6-digit reset code." });
      }
      resetFilter = { email: normalizedEmail, passwordResetTokenHash: hashResetToken(otp) };
    }

    const user = await User.findOne({
      ...resetFilter,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpiresAt +passwordResetRequestedAt");

    if (!user) {
      return res.status(400).json({ message: "This reset code or link is invalid or has expired." });
    }

    user.password = password;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.passwordResetRequestedAt = undefined;
    await user.save();

    res.json({ message: "Your password has been reset. You can now sign in." });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

router.get("/me", protect, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
