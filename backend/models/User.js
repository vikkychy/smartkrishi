import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address."],
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      match: [/^\+?[0-9]{7,15}$/, "Enter a valid phone number."],
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [8, "Password must be at least 8 characters."],
      select: false,
    },
    role: {
      type: String,
      enum: ["farmer", "buyer", "expert", "admin"],
      default: "buyer",
      required: true,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false,
    },
    passwordResetRequestedAt: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.pre("validate", function requireContact(next) {
  if (!this.email && !this.phone) {
    this.invalidate("email", "Provide an email address or phone number.");
    this.invalidate("phone", "Provide an email address or phone number.");
  }
  next();
});

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
