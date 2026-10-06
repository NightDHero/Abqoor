import { db } from "../../database/client.js";

type ExternalIdentityRecord = {
  provider: string;
  provider_subject: string;
  user_id: string;
  email: string;
  created_at: string;
};

const findIdentityStatement = db.prepare<
  [string, string],
  ExternalIdentityRecord
>(`
  SELECT * FROM auth_external_identities
  WHERE provider = ? AND provider_subject = ?
`);

const createIdentityStatement = db.prepare(`
  INSERT INTO auth_external_identities (
    provider, provider_subject, user_id, email, created_at
  ) VALUES (
    @provider, @providerSubject, @userId, @email, @createdAt
  )
`);

export const findExternalIdentity = async (
  provider: string,
  providerSubject: string
) => (await findIdentityStatement.get(provider, providerSubject)) ?? null;

export const createExternalIdentity = async (input: {
  email: string;
  provider: string;
  providerSubject: string;
  userId: string;
}) => {
  await createIdentityStatement.run({
    ...input,
    createdAt: new Date().toISOString()
  });
  return findExternalIdentity(input.provider, input.providerSubject);
};
