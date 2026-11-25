import { Schema, model } from "mongoose";

const lineSchema = new Schema(
  {
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true },
    projectName: String,
    standNumber: String,
    completedAt: Date,
    positionName: String,
    shareBps: Number,
    amountCents: { type: Number, required: true },
  },
  { _id: false },
);

// One payout = one worker's earnings for one month. Lines are a frozen snapshot,
// so statements and the bank schedule can be regenerated identically any time.
const schema = new Schema(
  {
    workerId: { type: Schema.Types.ObjectId, ref: "Worker", required: true },
    month: { type: String, required: true }, // 'YYYY-MM' (business-local)
    lines: { type: [lineSchema], default: [] },
    totalCents: { type: Number, required: true },
    status: {
      type: String,
      enum: ["draft", "approved", "paid"],
      default: "draft",
    },
    approvedAt: Date,
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    paymentRunId: { type: Schema.Types.ObjectId, ref: "PaymentRun" }, // set when the bank PDF is generated
  },
  { timestamps: true },
);

schema.index({ workerId: 1, month: 1 }, { unique: true });
schema.index({ month: 1, status: 1 });

export const Payout = model("Payout", schema);
