import { Router, type Response } from 'express';
import { requireRole } from '../../middleware/auth';
import { AppError } from '../../utils/AppError';
import { monthParam } from '../../utils/validation';
import { saveProof, uploadSingleFile } from '../proofs/proof.service';
import { PaymentRun } from './payment-run.model';
import { PaymentProof } from '../proofs/proof.model';
import { allStatementsPdf, bankSchedulePdf, markPaid, runOverview } from './payment.service';

// Contains bank details and salary data: admin only.
export const paymentRunRoutes = Router();
paymentRunRoutes.use(requireRole('admin'));

export function sendPdf(res: Response, buffer: Buffer, filename: string) {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(buffer);
}

paymentRunRoutes.get('/:month', async (req, res) => {
  res.json(await runOverview(monthParam.parse(req.params.month)));
});

paymentRunRoutes.get('/:month/bank-schedule.pdf', async (req, res) => {
  const month = monthParam.parse(req.params.month);
  sendPdf(res, await bankSchedulePdf(month, req.user!.id), `bank-payment-schedule-${month}.pdf`);
});

paymentRunRoutes.get('/:month/statements.pdf', async (req, res) => {
  const month = monthParam.parse(req.params.month);
  sendPdf(res, await allStatementsPdf(month, req.user!.id), `salary-statements-${month}.pdf`);
});

paymentRunRoutes.post('/:month/proofs', uploadSingleFile, async (req, res) => {
  const month = monthParam.parse(req.params.month);
  const run = await PaymentRun.findOne({ month });
  if (!run) throw new AppError(409, 'NO_RUN', 'Generate the bank payment schedule before uploading proof of payment');
  const proof = await saveProof({ file: req.file, paymentRunId: String(run._id), month, userId: req.user!.id });
  res.status(201).json({ id: proof._id, originalName: proof.originalName, mimeType: proof.mimeType, sizeBytes: proof.sizeBytes });
});

paymentRunRoutes.get('/:month/proofs', async (req, res) => {
  const month = monthParam.parse(req.params.month);
  const proofs = await PaymentProof.find({ month }).sort({ uploadedAt: -1 });
  res.json(proofs.map((p) => ({ id: p._id, originalName: p.originalName, mimeType: p.mimeType, sizeBytes: p.sizeBytes, uploadedAt: (p as any).uploadedAt })));
});

paymentRunRoutes.post('/:month/mark-paid', async (req, res) => {
  const run = await markPaid(monthParam.parse(req.params.month), req.user!.id);
  res.json({ month: run.month, status: run.status, paidAt: run.paidAt });
});