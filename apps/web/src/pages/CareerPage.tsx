import { CareerDashboard } from "../features/career/CareerDashboard";

export function CareerPage({ userId, username }: { userId: string; username?: string | null }) {
  return <CareerDashboard userId={userId} username={username} />;
}
