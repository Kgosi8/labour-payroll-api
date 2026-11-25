import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { validateBody } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { User } from './user.model';

export const authRoutes = Router();

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10); // keeps timing similar for unknown emails

const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: true, legacyHeaders: false });

authRoutes.post(
  '/login',
  loginLimiter,
  validateBody(z.object({ email: z.string().email(), password: z.string().min(1) })),
  async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase(), active: true }).select('+passwordHash');
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new AppError(401, 'BAD_CREDENTIALS', 'Incorrect email or password');

    const token = jwt.sign({ role: user.role }, env.JWT_SECRET, {
      subject: String(user._id),
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  },
);

authRoutes.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user!.id);
  if (!user || !user.active) throw new AppError(401, 'UNAUTHENTICATED', 'Account not available');
  res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
});