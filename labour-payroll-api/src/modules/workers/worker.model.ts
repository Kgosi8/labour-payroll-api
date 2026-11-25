import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    idNumberEnc: { type: String, required: true }, // encrypted at rest
    idNumberHash: { type: String, required: true, unique: true }, // blind index: duplicate detection only
    phone: { type: String, trim: true },
    address: {
      street: { type: String, required: true, trim: true },
      suburb: { type: String, trim: true },
      city: { type: String, required: true, trim: true },
      postalCode: { type: String, trim: true },
    },
    bank: {
      bankName: { type: String, required: true, trim: true },
      accountHolder: { type: String, required: true, trim: true },
      accountNumberEnc: { type: String, required: true }, // encrypted at rest
      accountLast4: { type: String, required: true },
      branchCode: { type: String, required: true },
      accountType: {
        type: String,
        enum: ["cheque", "savings", "transmission"],
        required: true,
      },
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

schema.index({ lastName: 1, firstName: 1 });

export const Worker = model("Worker", schema);
