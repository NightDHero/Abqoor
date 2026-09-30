import type { BankConfig } from "../types/profile";
import { apiRequest } from "./http";

export const bankService = {
  getConfig: () => apiRequest<{ config: BankConfig }>("/banks/config")
};
