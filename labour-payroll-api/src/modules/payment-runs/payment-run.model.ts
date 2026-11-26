import { Schema, model } from "mongoose";

// One run = one month's batch handed to the bank. Created the first time the bank schedule is generated.
const schema = new Schema(
  {
    month: { type: String, required: true, unique: true },
    status: { type: String, enum: ["generated", "paid"], default: "generated" },
    totalCents: { type: Number, required: true },
    workerCount: { type: Number, required: true },
    generationCount: { type: Number, default: 0 }, // how many times the bank PDF was produced (reprints)
    generatedAt: Date,
    generatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    paidAt: Date,
    paidBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const PaymentRun = model("PaymentRun", schema);
