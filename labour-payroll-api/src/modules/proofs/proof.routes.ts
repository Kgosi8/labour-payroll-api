import { Router } from "express";
import { requireRole } from "../../middleware/auth";
import { AppError } from "../../utils/AppError";
import { objectId } from "../../utils/validation";
import { audit } from "../audit/audit.service";
import { PaymentProof } from "./proof.model";
import { storage } from "./storage";

export const proofRoutes = Router();
proofRoutes.use(requireRole("admin"));

// Streams through the API so access control always applies (no public file URLs).
proofRoutes.get("/:id/file", async (req, res) => {
  const id = objectId.parse(req.params.id);
  const proof = await PaymentProof.findById(id);
  if (!proof) throw new AppError(404, "NOT_FOUND", "Proof not found");
  await audit(req.user!.id, "proof.view", "PaymentProof", id);

  const stream = await storage.getStream(proof.storageKey);
  res.set({
    "Content-Type": proof.mimeType,
    "Content-Disposition": `inline; filename="${proof.originalName.replace(/"/g, "")}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  stream.on("error", () => res.destroy());
  stream.pipe(res);
});
