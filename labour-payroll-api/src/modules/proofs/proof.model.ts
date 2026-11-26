import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    paymentRunId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentRun",
      required: true,
      index: true,
    },
    month: { type: String, required: true, index: true },
    storageKey: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    sha256: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: "uploadedAt", updatedAt: false } },
);

export const PaymentProof = model("PaymentProof", schema);
