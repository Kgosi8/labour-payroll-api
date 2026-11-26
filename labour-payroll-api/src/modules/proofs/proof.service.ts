import crypto from 'node:crypto';
import multer from 'multer';
import { AppError } from '../../utils/AppError';
import { audit } from '../audit/audit.service';
import { PaymentProof } from './proof.model';
import { storage } from './storage';

export const MAX_PROOF_BYTES = 10 * 1024 * 1024;

export const uploadSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PROOF_BYTES, files: 1 },
}).single('file');

/** Decide the real type from the file's first bytes. The client-supplied mimetype and filename are never trusted. */
export function detectType(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.subarray(0, 1024).includes(Buffer.from('%PDF-'))) return { mime: 'application/pdf', ext: 'pdf' };
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', ext: 'png' };
  }
  return null;
}

const safeName = (n: string) => n.replace(/[^\w.\- ()]/g, '_').slice(0, 120) || 'proof';

export async function saveProof(args: {
  file?: Express.Multer.File;
  paymentRunId: string;
  month: string;
  userId: string;
}) {
  const { file, paymentRunId, month, userId } = args;
  if (!file) throw new AppError(400, 'NO_FILE', 'Attach a file in the "file" field');
  const type = detectType(file.buffer);
  if (!type) throw new AppError(415, 'UNSUPPORTED_FILE', 'Only PDF, JPEG or PNG files are accepted');

  const storageKey = `proofs/${month}/${crypto.randomUUID()}.${type.ext}`;
  await storage.put(storageKey, file.buffer, type.mime);

  const proof = await PaymentProof.create({
    paymentRunId,
    month,
    storageKey,
    originalName: safeName(file.originalname),
    mimeType: type.mime,
    sizeBytes: file.size,
    sha256: crypto.createHash('sha256').update(file.buffer).digest('hex'),
    uploadedBy: userId,
  });
  await audit(userId, 'proof.upload', 'PaymentProof', String(proof._id), { month, sizeBytes: file.size });
  return proof;
}