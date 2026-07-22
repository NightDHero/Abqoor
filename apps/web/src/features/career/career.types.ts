export type CareerWorldId = "math" | "arabic";
export type PillarAccent = "turquoise" | "cyan" | "orange" | "gold";

export type SubtopicPillar = {
  accent: PillarAccent;
  id: string;
  masteryPercent: number;
  name: string;
  route: string;
  routeSlug: string;
  type: "subtopic";
};

export type TopicPillar = {
  accent: PillarAccent;
  id: string;
  masteryPercent: number;
  name: string;
  practiceRoute: string;
  route: string;
  routeSlug: string;
  subtopics?: SubtopicPillar[];
  type: "topic";
};

export type CareerWorld = {
  id: CareerWorldId;
  label: string;
  title: string;
  description: string;
  topics: TopicPillar[];
};
