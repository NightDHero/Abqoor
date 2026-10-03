import { CareerDashboard } from "../features/career/CareerDashboard";

export function CareerPage({ username }: { username?: string | null }) {
  return <CareerDashboard username={username} />;
}
