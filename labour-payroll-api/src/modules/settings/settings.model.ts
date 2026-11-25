import { Schema, model } from 'mongoose';

const positionSchema = new Schema({
  name: { type: String, required: true, trim: true },
  shareBps: { type: Number, required: true, min: 0, max: 10000 }, // basis points: 2000 = 20.00%
});

const schema = new Schema(
  {
    key: { type: String, default: 'company', unique: true }, // singleton
    companyName: { type: String, required: true },
    ratePerHouseCents: { type: Number, required: true, min: 1 },
    rateEffectiveFrom: { type: Date, default: Date.now },
    positions: { type: [positionSchema], default: [] },
  },
  { timestamps: true },
);

export const Settings = model('Settings', schema);