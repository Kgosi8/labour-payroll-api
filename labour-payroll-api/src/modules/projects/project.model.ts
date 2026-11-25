import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    location: { type: String, trim: true },
    status: { type: String, enum: ["active", "closed"], default: "active" },
  },
  { timestamps: true },
);

export const Project = model("Project", schema);
