import { createHash } from "node:crypto";
import type { Request } from "express";

export type SecurityEventType =
  | "auth.login"
  | "auth.google_login"
  | "auth.google_link"
  | "auth.email_verification_requested"
  | "auth.phone_verification_requested"
  | "auth.logout"
  | "auth.password_reset"
  | "auth.password_reset_requested"
  | "auth.registration"
  | "authorization.denied"
  | "admin.login"
  | "admin.privilege_granted"
  | "admin.privilege_removed"
  | "admin.import"
  | "rate_limit.exceeded";

export const fingerprintIdentifier = (value: string) =>
  createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 16);

export const writeSecurityEvent = (
  request: Request,
  event: SecurityEventType,
  input: {
    actorUserId?: string;
    outcome: "success" | "failure" | "blocked";
    targetId?: string;
    detail?: Record<string, string | number | boolean>;
  }
) => {
  const record = {
    actorUserId: input.actorUserId,
    clientIp: request.ip || request.socket.remoteAddress || "unknown",
    detail: input.detail,
    event,
    outcome: input.outcome,
    requestId: request.requestId,
    targetId: input.targetId,
    timestamp: new Date().toISOString()
  };
  const output = JSON.stringify(record);
  if (input.outcome === "success") console.info(output);
  else console.warn(output);
};
