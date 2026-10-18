import { Router } from "express";
import mongoose from "mongoose";
import Harvest from "../models/Harvest.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();
const editableFields = [
  "cropName",
  "variety",
  "plantingDate",
  "harvestDate",
  "expectedYieldKg",
  "actualYieldKg",
  "revenue",
  "expenses",
  "status",
  "currentStage",
];

function stageForStatus(status) {
  return status === "harvested" ? "harvesting" : status === "growing" ? "growing" : "planting";
}

function recordStage(harvest, stage) {
  if (harvest.currentStage === stage) return;
  const previous = [...harvest.growthStages].reverse().find((item) => item.name === harvest.currentStage && !item.completedAt);
  if (previous) previous.completedAt = new Date();
  if (!harvest.growthStages.some((item) => item.name === stage && !item.completedAt)) {
    harvest.growthStages.push({ name: stage });
  }
  harvest.currentStage = stage;
}

router.use(protect, authorize("farmer"));

router.get("/", async (req, res, next) => {
  try {
    const harvests = await Harvest.find({ farmerId: req.user._id }).sort({ harvestDate: 1 });
    res.json({ harvests });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const values = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => editableFields.includes(key) || key === "expenseLedger")
    );
    if (values.status) values.currentStage = stageForStatus(values.status);
    if (values.currentStage && !values.growthStages) values.growthStages = [{ name: values.currentStage }];
    const harvest = await Harvest.create({
      ...values,
      farmerId: req.user._id,
    });
    res.status(201).json({ harvest });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid harvest ID." });
    }

    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => editableFields.includes(key))
    );
    const harvest = await Harvest.findOne({ _id: req.params.id, farmerId: req.user._id });

    if (!harvest) {
      return res.status(404).json({ message: "Harvest record not found." });
    }
    for (const [key, value] of Object.entries(updates)) harvest[key] = value;
    if (updates.status) recordStage(harvest, stageForStatus(updates.status));
    else if (updates.currentStage) recordStage(harvest, updates.currentStage);
    await harvest.save();
    res.json({ harvest });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

router.post("/:id/expenses", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid harvest ID." });
    }
    const { category, amount, date, note = "" } = req.body;
    if (!["seeds", "fertilizer", "labor", "irrigation", "other"].includes(category)) {
      return res.status(400).json({ message: "Choose a valid expense category." });
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json({ message: "Expense amount must be a non-negative number." });
    }

    const harvest = await Harvest.findOne({ _id: req.params.id, farmerId: req.user._id });
    if (!harvest) return res.status(404).json({ message: "Harvest record not found." });

    if (harvest.expenses > 0 && harvest.expenseLedger.length === 0) {
      harvest.expenseLedger.push({
        category: "other",
        amount: harvest.expenses,
        note: "Previously recorded expenses",
      });
    }
    harvest.expenseLedger.push({ category, amount: Number(amount), date, note });
    await harvest.save();
    res.status(201).json({ harvest });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid harvest ID." });
    }

    const harvest = await Harvest.findOneAndDelete({
      _id: req.params.id,
      farmerId: req.user._id,
    });
    if (!harvest) {
      return res.status(404).json({ message: "Harvest record not found." });
    }
    res.json({ message: "Harvest record deleted." });
  } catch (error) {
    next(error);
  }
});

export default router;
