import { Router } from 'express';
import { requireRole } from '../../middleware/auth';
import { AppError } from '../../utils/AppError';
import { monthParam, objectId } from '../../utils/validation';
import { Payout } from './payout.model';
import { approveMonth, generateDrafts } from './payout.service';
import { singleStatementPdf } from '../payment-runs/payment-run.service';
import { sendPdf } from '../payment-runs/payment-run.routes';

// Salary data: admin only.
export const payoutRoutes = Router();
payoutRoutes.use(requireRole('admin'));

payoutRoutes.get('/', async (req, res) => {
  const month = monthParam.parse(req.query.month);
  const payouts = await Payout.find({ month }).populate('workerId', 'firstName lastName status').sort({ createdAt: 1 });
  res.json({
    month,
    totalCents: payouts.reduce((s, p) => s + p.totalCents, 0),
    payouts,
  });
});

payoutRoutes.get('/:id/statement.pdf', async (req, res) => {
  const { buffer, month, worker } = await singleStatementPdf(objectId.parse(req.params.id), req.user!.id);
  sendPdf(res, buffer, `statement-${month}-${worker.lastName}.pdf`.replace(/[^\w.\-]/g, '_'));
});

payoutRoutes.get('/:id', async (req, res) => {
  const payout = await Payout.findById(objectId.parse(req.params.id)).populate('workerId', 'firstName lastName');
  if (!payout) throw new AppError(404, 'NOT_FOUND', 'Payout not found');
  res.json(payout);
});

payoutRoutes.post('/:month/generate', async (req, res) => {
  res.json(await generateDrafts(monthParam.parse(req.params.month), req.user!.id));
});

payoutRoutes.post('/:month/approve', async (req, res) => {
  res.json(await approveMonth(monthParam.parse(req.params.month), req.user!.id));
});