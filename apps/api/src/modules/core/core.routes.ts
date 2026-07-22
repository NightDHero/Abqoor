import { Router } from "express";

export const coreRouter = Router();

coreRouter.get("/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    service: "abqoor-api"
  });
});
