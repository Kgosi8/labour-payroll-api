import { AuditLog, type AuditUserId } from './audit.model';

/** Fire-and-forget: an audit failure must never break the main operation. */
export async function audit(
  userId: AuditUserId,
  action: string,
  entity: string,
  entityId?: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await AuditLog.create({ userId, action, entity, entityId, meta });
  } catch (err) {
    console.error('audit log failed', err);
  }
}