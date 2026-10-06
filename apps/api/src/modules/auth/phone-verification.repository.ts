import { randomUUID } from "node:crypto";
import { db } from "../../database/client.js";

export type PhoneVerificationPurpose = "registration" | "link";

type PhoneVerificationRequestRecord = {
  id: string;
  phone_number: string;
  purpose: PhoneVerificationPurpose;
  user_id: string | null;
  created_at: string;
};

const findLatestStatement = db.prepare<
  [string, PhoneVerificationPurpose],
  PhoneVerificationRequestRecord
>(`
  SELECT * FROM phone_verification_requests
  WHERE phone_number = ? AND purpose = ?
  ORDER BY created_at DESC
  LIMIT 1
`);

const createStatement = db.prepare(`
  INSERT INTO phone_verification_requests (
    id, phone_number, purpose, user_id, created_at
  ) VALUES (
    @id, @phoneNumber, @purpose, @userId, @createdAt
  )
`);

const cleanupStatement = db.prepare(`
  DELETE FROM phone_verification_requests
  WHERE created_at < @cutoff
`);

export const findLatestPhoneVerificationRequest = async (
  phoneNumber: string,
  purpose: PhoneVerificationPurpose
) => (await findLatestStatement.get(phoneNumber, purpose)) ?? null;

export const recordPhoneVerificationRequest = async (input: {
  phoneNumber: string;
  purpose: PhoneVerificationPurpose;
  userId?: string | null;
}) => {
  await cleanupStatement.run({
    cutoff: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  });
  await createStatement.run({
    createdAt: new Date().toISOString(),
    id: randomUUID(),
    phoneNumber: input.phoneNumber,
    purpose: input.purpose,
    userId: input.userId ?? null
  });
};
