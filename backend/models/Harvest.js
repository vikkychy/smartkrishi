import mongoose from "mongoose";

const growthStageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["planting", "growing", "harvesting"],
      required: true,
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["seeds", "fertilizer", "labor", "irrigation", "other"],
      required: true,
    },
    amount: { type: Number, required: true, min: [0, "Expense cannot be negative."] },
    date: { type: Date, default: Date.now },
    note: { type: String, trim: true, maxlength: 240, default: "" },
  },
  { timestamps: true }
);

const harvestSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    cropName: {
      type: String,
      required: [true, "Crop name is required."],
      trim: true,
      maxlength: 120,
    },
    variety: { type: String, trim: true, maxlength: 120, default: "" },
    plantingDate: {
      type: Date,
      required: [true, "Planting date is required."],
    },
    harvestDate: {
      type: Date,
      required: [true, "Expected harvest date is required."],
    },
    expectedYieldKg: { type: Number, min: [0, "Expected yield cannot be negative."], default: 0 },
    actualYieldKg: { type: Number, min: [0, "Actual yield cannot be negative."], default: 0 },
    revenue: { type: Number, min: [0, "Revenue cannot be negative."], default: 0 },
    expenses: {
      type: Number,
      min: [0, "Expenses cannot be negative."],
      default: 0,
    },
    expenseLedger: { type: [expenseSchema], default: [] },
    growthStages: {
      type: [growthStageSchema],
      default: () => [{ name: "planting" }],
    },
    currentStage: {
      type: String,
      enum: ["planting", "growing", "harvesting"],
      default: "planting",
    },
    status: {
      type: String,
      enum: ["planned", "growing", "harvested"],
      default: "planned",
      index: true,
    },
  },
  { timestamps: true }
);

harvestSchema.pre("validate", function validateSchedule() {
  if (this.plantingDate && this.harvestDate && this.harvestDate < this.plantingDate) {
    this.invalidate("harvestDate", "Expected harvest date must be after planting date.");
  }
  if (this.isModified("expenseLedger") && this.expenseLedger.length > 0) {
    this.expenses = this.expenseLedger.reduce((total, entry) => total + entry.amount, 0);
  }
});

const Harvest = mongoose.model("Harvest", harvestSchema);

export default Harvest;
