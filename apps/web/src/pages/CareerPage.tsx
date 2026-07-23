import { CareerDashboard } from "../features/career/CareerDashboard";
import type { User } from "../types/auth";

export function CareerPage({
  onLogout,
  user
}: {
  onLogout: () => void;
  user: User | null;
}) {
  return <CareerDashboard onLogout={onLogout} user={user} />;
}
