import { Workspace } from "@/components/workspace";
import { isMentorPreviewEnabled } from "@/lib/release";
import { getLocale } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { redirect } from "next/navigation";
export default async function DemoWorkspace() {
  if (isMentorPreviewEnabled()) redirect(localizePath("/", await getLocale()));
  return <Workspace />;
}
