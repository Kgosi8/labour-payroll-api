import { Router } from "express";
import { requireAuth } from "./middleware/auth";
import { authRoutes } from "./modules/auth/auth.routes";
import { workerRoutes } from "./modules/workers/worker.routes";
import { settingsRoutes } from "./modules/settings/settings.routes";
import { projectRoutes } from "./modules/projects/project.routes";
import { payoutRoutes } from "./modules/payouts/payout.routes";
import { paymentRunRoutes } from "./modules/payment-runs/payment-run.routes";
import { proofRoutes } from "./modules/proofs/proof.routes";

export const routes = Router();

routes.use("/auth", authRoutes);

// Everything below requires a valid token
routes.use(requireAuth);
routes.use("/workers", workerRoutes);
routes.use("/settings", settingsRoutes);
routes.use("/", projectRoutes); // /projects, /houses
routes.use("/payouts", payoutRoutes);
routes.use("/payment-runs", paymentRunRoutes);
routes.use("/proofs", proofRoutes);
