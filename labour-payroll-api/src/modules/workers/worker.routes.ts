import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { AppError } from "../../utils/AppError";
import { blindIndex, encrypt } from "../../utils/crypto";
import { objectId } from "../../utils/validation";
import { audit } from "../audit/audit.service";
import { Worker } from "./worker.model";
import { serializeWorker } from "./worker.service";

export const workerRoutes = Router();

const addressSchema = z.object({
  street: z.string().min(1),
  suburb: z.string().optional(),
  city: z.string().min(1),
  postalCode: z.string().optional(),
});

const bankSchema = z.object({
  bankName: z.string().min(1),
  accountHolder: z.string().min(1),
  accountNumber: z
    .string()
    .regex(/^\d{6,16}$/, "Account number must be 6-16 digits"),
  branchCode: z.string().regex(/^\d{6}$/, "Branch code must be 6 digits"),
  accountType: z.enum(["cheque", "savings", "transmission"]),
});

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  idNumber: z.string().min(6),
  phone: z.string().optional(),
  address: addressSchema,
  bank: bankSchema,
});
const updateSchema = createSchema
  .partial()
  .extend({ status: z.enum(["active", "inactive"]).optional() });

function bankFields(b: z.infer<typeof bankSchema>) {
  return {
    bankName: b.bankName,
    accountHolder: b.accountHolder,
    accountNumberEnc: encrypt(b.accountNumber),
    accountLast4: b.accountNumber.slice(-4),
    branchCode: b.branchCode,
    accountType: b.accountType,
  };
}

workerRoutes.get("/", async (req, res) => {
  const isAdmin = req.user!.role === "admin";
  const filter = req.query.status ? { status: String(req.query.status) } : {};
  const workers = await Worker.find(filter).sort({ lastName: 1, firstName: 1 });
  res.json(
    workers.map((w) => serializeWorker(w, isAdmin ? "masked" : "basic")),
  );
});

workerRoutes.get("/:id", async (req, res) => {
  const id = objectId.parse(req.params.id);
  const w = await Worker.findById(id);
  if (!w) throw new AppError(404, "NOT_FOUND", "Worker not found");
  if (req.user!.role !== "admin")
    return void res.json(serializeWorker(w, "basic"));
  await audit(req.user!.id, "worker.view_sensitive", "Worker", id);
  res.json(serializeWorker(w, "full"));
});

workerRoutes.post(
  "/",
  requireRole("admin"),
  validateBody(createSchema),
  async (req, res) => {
    const b = req.body as z.infer<typeof createSchema>;
    const w = await Worker.create({
      firstName: b.firstName,
      lastName: b.lastName,
      idNumberEnc: encrypt(b.idNumber),
      idNumberHash: blindIndex(b.idNumber),
      phone: b.phone,
      address: b.address,
      bank: bankFields(b.bank),
      createdBy: req.user!.id,
    });
    await audit(req.user!.id, "worker.create", "Worker", String(w._id));
    res.status(201).json(serializeWorker(w, "masked"));
  },
);

workerRoutes.patch(
  "/:id",
  requireRole("admin"),
  validateBody(updateSchema),
  async (req, res) => {
    const id = objectId.parse(req.params.id);
    const b = req.body as z.infer<typeof updateSchema>;
    const w = await Worker.findById(id);
    if (!w) throw new AppError(404, "NOT_FOUND", "Worker not found");

    if (b.firstName !== undefined) w.firstName = b.firstName;
    if (b.lastName !== undefined) w.lastName = b.lastName;
    if (b.phone !== undefined) w.phone = b.phone;
    if (b.status !== undefined) w.status = b.status;
    if (b.address) w.set("address", b.address);
    if (b.idNumber) {
      w.idNumberEnc = encrypt(b.idNumber);
      w.idNumberHash = blindIndex(b.idNumber);
    }
    const bankChanged = !!b.bank;
    if (b.bank) w.set("bank", bankFields(b.bank));

    await w.save();
    await audit(
      req.user!.id,
      bankChanged ? "worker.update_bank" : "worker.update",
      "Worker",
      id,
    );
    res.json(serializeWorker(w, "masked"));
  },
);
