import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../../middleware/validate";
import { AppError } from "../../utils/AppError";
import { objectId } from "../../utils/validation";
import { audit } from "../audit/audit.service";
import { Settings } from "../settings/settings.model";
import { Worker } from "../workers/worker.model";
import { Project } from "./project.model";
import { House } from "./house.model";
import { HouseAssignment } from "./assignment.model";
import { completeHouse } from "./house.service";

// Supervisors and admins can both use these routes. Pay amounts are never returned here.
export const projectRoutes = Router();

projectRoutes.get("/projects", async (_req, res) => {
  res.json(await Project.find().sort({ name: 1 }));
});

projectRoutes.post(
  "/projects",
  validateBody(
    z.object({ name: z.string().min(1), location: z.string().optional() }),
  ),
  async (req, res) => {
    const p = await Project.create(req.body);
    await audit(req.user!.id, "project.create", "Project", String(p._id));
    res.status(201).json(p);
  },
);

projectRoutes.get("/projects/:projectId/houses", async (req, res) => {
  const projectId = objectId.parse(req.params.projectId);
  const houses = await House.find({ projectId })
    .select("-snapshot")
    .sort({ standNumber: 1 });
  res.json(houses);
});

projectRoutes.post(
  "/projects/:projectId/houses",
  validateBody(
    z.object({
      standNumber: z.string().min(1),
      houseType: z.string().optional(),
    }),
  ),
  async (req, res) => {
    const projectId = objectId.parse(req.params.projectId);
    if (!(await Project.exists({ _id: projectId })))
      throw new AppError(404, "NOT_FOUND", "Project not found");
    const h = await House.create({
      ...req.body,
      projectId,
      startedAt: new Date(),
    });
    await audit(req.user!.id, "house.create", "House", String(h._id));
    res.status(201).json(h);
  },
);

projectRoutes.get("/houses/:id", async (req, res) => {
  const id = objectId.parse(req.params.id);
  const house = await House.findById(id).select("-snapshot");
  if (!house) throw new AppError(404, "NOT_FOUND", "House not found");
  const crew = await HouseAssignment.find({ houseId: id });
  res.json({ house, crew });
});

// Replace the whole crew for a house (simple for the UI: send the final list).
projectRoutes.put(
  "/houses/:id/crew",
  validateBody(
    z.object({
      assignments: z
        .array(z.object({ workerId: objectId, positionId: objectId }))
        .max(50),
    }),
  ),
  async (req, res) => {
    const id = objectId.parse(req.params.id);
    const house = await House.findById(id);
    if (!house) throw new AppError(404, "NOT_FOUND", "House not found");
    if (house.status === "complete")
      throw new AppError(
        409,
        "HOUSE_LOCKED",
        "A completed house can no longer be changed",
      );

    const { assignments } = req.body as {
      assignments: { workerId: string; positionId: string }[];
    };
    if (
      new Set(assignments.map((a) => a.workerId)).size !== assignments.length
    ) {
      throw new AppError(
        400,
        "DUPLICATE_WORKER",
        "A worker can only appear once per house",
      );
    }

    const settings = await Settings.findOne({ key: "company" });
    const validPositions = new Set(
      (settings?.positions ?? []).map((p) => String(p._id)),
    );
    if (assignments.some((a) => !validPositions.has(a.positionId))) {
      throw new AppError(
        400,
        "UNKNOWN_POSITION",
        "One or more positions do not exist",
      );
    }
    const activeCount = await Worker.countDocuments({
      _id: { $in: assignments.map((a) => a.workerId) },
      status: "active",
    });
    if (activeCount !== assignments.length) {
      throw new AppError(
        400,
        "INVALID_WORKER",
        "One or more workers do not exist or are inactive",
      );
    }

    await HouseAssignment.deleteMany({ houseId: id });
    await HouseAssignment.insertMany(
      assignments.map((a) => ({ ...a, houseId: id })),
    );
    await audit(req.user!.id, "house.set_crew", "House", id, {
      count: assignments.length,
    });
    res.json(await HouseAssignment.find({ houseId: id }));
  },
);

projectRoutes.post("/houses/:id/complete", async (req, res) => {
  const house = await completeHouse(
    objectId.parse(req.params.id),
    req.user!.id,
  );
  res.json({
    id: house._id,
    status: house.status,
    completedAt: house.completedAt,
  });
});
