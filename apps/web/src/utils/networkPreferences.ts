export type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
};

export const getNetworkInformation = (): NetworkInformationLike | null => {
  if (typeof navigator === "undefined") return null;

  return (
    navigator as Navigator & {
      connection?: NetworkInformationLike;
    }
  ).connection ?? null;
};

export const shouldAvoidSpeculativePreloading = (
  connection: NetworkInformationLike | null = getNetworkInformation()
) => Boolean(
  connection?.saveData ||
  connection?.effectiveType === "slow-2g" ||
  connection?.effectiveType === "2g"
);
