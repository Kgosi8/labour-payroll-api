import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { objectId } from '../../utils/validation';
import { audit } from '../audit/audit.service';
import { Settings } from './settings.model';

export const settingsRoutes = Router();

const bodySchema = z
  .object({
    companyName: z.string().min(1),
    ratePerHouseCents: z.number().int().positive(),
    positions: z
      .array(
        z.object({
          id: objectId.optional(), // pass the existing id to keep a position's identity when editing
          name: z.string().min(1),
          shareBps: z.number().int().min(0).max(10000),
        }),
      )
      .min(1),
  })
  .refine((v) => v.positions.reduce((s, p) => s + p.shareBps, 0) === 10000, {
    message: 'Position shares must add up to exactly 100%',
    path: ['positions'],
  })
  .refine((v) => new Set(v.positions.map((p) => p.name.toLowerCase())).size === v.positions.length, {
    message: 'Position names must be unique',
    path: ['positions'],
  });

// Supervisors need position names/ids to build crews, but not pay figures.
settingsRoutes.get('/positions', async (_req, res) => {
  const s = await Settings.findOne({ key: 'company' });
  res.json((s?.positions ?? []).map((p) => ({ id: p._id, name: p.name })));
});

settingsRoutes.get('/', requireRole('admin'), async (_req, res) => {
  res.json(await Settings.findOne({ key: 'company' }));
});

settingsRoutes.put('/', requireRole('admin'), validateBody(bodySchema), async (req, res) => {
  const { companyName, ratePerHouseCents, positions } = req.body;
  const existing = await Settings.findOne({ key: 'company' });
  const rateChanged = !existing || existing.ratePerHouseCents !== ratePerHouseCents;

  const doc = await Settings.findOneAndUpdate(
    { key: 'company' },
    {
      companyName,
      ratePerHouseCents,
      ...(rateChanged ? { rateEffectiveFrom: new Date() } : {}),
      positions: positions.map((p: { id?: string; name: string; shareBps: number }) => ({
        ...(p.id ? { _id: p.id } : {}),
        name: p.name,
        shareBps: p.shareBps,
      })),
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await audit(req.user!.id, 'settings.update', 'Settings', String(doc._id), { ratePerHouseCents });
  res.json(doc);
});