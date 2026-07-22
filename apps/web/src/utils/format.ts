export const formatPercent = (value: number) => {
  return new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: 0,
    style: "percent"
  }).format(value / 100);
};
