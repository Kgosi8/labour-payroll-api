import { Schema, model, Types } from 'mongoose';

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: 'at', updatedAt: false } },
);

export const AuditLog = model('AuditLog', schema);
export type AuditUserId = string | Types.ObjectId;