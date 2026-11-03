import "server-only";
import { connection } from "next/server";
import { isFounderRegistrationEnabled } from "@/lib/release";

/** Read runtime configuration after prerendering; never freeze signup availability in the build. */
export async function getFounderRegistrationEnabled() {
  await connection();
  return isFounderRegistrationEnabled();
}
