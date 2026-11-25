import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

/** Validates and replaces req.body with the parsed (typed, stripped) result. */
export const validateBody =
  (schema: ZodTypeAny): RequestHandler =>
  (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
