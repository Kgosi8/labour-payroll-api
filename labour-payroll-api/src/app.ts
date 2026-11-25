import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env";
import { routes } from "./routes";
import { errorHandler, notFound } from "./middleware/errorHandler";

export function createApp() {
  const app = express();
  const origins = env.CORS_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(cors({ origin: origins.length ? origins : false }));
  app.use(express.json({ limit: "1mb" }));
  if (env.NODE_ENV !== "test") app.use(morgan("dev"));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/v1", routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
