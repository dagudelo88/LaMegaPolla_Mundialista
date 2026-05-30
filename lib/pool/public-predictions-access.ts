import { getConfigBoolean } from "@/lib/config/get-config";

const CONFIG_KEY = "pool.public_predictions_enabled";

export async function isPublicPredictionsEnabled(): Promise<boolean> {
  return getConfigBoolean(CONFIG_KEY, false);
}
