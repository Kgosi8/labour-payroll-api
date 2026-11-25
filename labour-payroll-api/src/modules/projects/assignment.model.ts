import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true },
    workerId: { type: Schema.Types.ObjectId, ref: "Worker", required: true },
    // _id of a position in Settings.positions. Stored per assignment: the same
    // person can be a bricklayer on one house and a foreman on another.
    positionId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

schema.index({ houseId: 1, workerId: 1 }, { unique: true });
schema.index({ workerId: 1 });

export const HouseAssignment = model("HouseAssignment", schema);
