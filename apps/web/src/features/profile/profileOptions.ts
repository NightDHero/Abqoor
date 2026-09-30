import type { WeakerSection } from "../../types/profile";

export const weakerSectionOptions: Array<{
  label: string;
  value: WeakerSection;
}> = [
  { label: "القسم الكمي", value: "quantitative" },
  { label: "القسم اللفظي", value: "verbal" },
  { label: "كلاهما بنفس المستوى", value: "both" }
];

export const getOptionLabel = <T extends string>(
  options: Array<{ label: string; value: T }>,
  value: T | null
) => {
  return options.find((option) => option.value === value)?.label ?? "غير محدد";
};
