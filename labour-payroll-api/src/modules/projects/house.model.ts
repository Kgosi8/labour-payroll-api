import { Schema, model } from "mongoose";

const snapshotPosition = new Schema(
  { positionId: String, name: String, shareBps: Number },
  { _id: false },
);

const schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    standNumber: { type: String, required: true, trim: true },
    houseType: { type: String, trim: true },
    status: {
      type: String,
      enum: ["in_progress", "complete"],
      default: "in_progress",
      index: true,
    },
    startedAt: { type: Date },
    completedAt: { type: Date, index: true },
    completedBy: { type: Schema.Types.ObjectId, ref: "User" },
    // Frozen at the moment the supervisor marks the house complete.
    // Later changes to the rate or position shares never affect this house.
    snapshot: {
      amountCents: Number,
      positions: { type: [snapshotPosition], default: undefined },
    },
  },
  { timestamps: true },
);

schema.index({ projectId: 1, standNumber: 1 }, { unique: true });

export const House = model("House", schema);
