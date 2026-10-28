"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { actionPath, getActionLocale } from "@/lib/i18n/action-locale";
import { PaymentError } from "@/lib/payments/config";
import { createContributionService } from "@/lib/payments/service";
export type ContributionState = { error: string } | null;
export async function startContribution(): Promise<ContributionState> {
  const user = await getCurrentUser();
  if (!user) redirect(await actionPath("/connexion"));
  let url: string | null;
  try {
    url = await createContributionService().checkout(user.id, await getActionLocale());
  } catch (error) {
    return {
      error:
        error instanceof PaymentError
          ? error.message
          : "Le paiement n’a pas pu démarrer. Réessayez dans un instant.",
    };
  }
  revalidatePath("/[lang]/contribution", "page");
  redirect(url ?? (await actionPath("/contribution")));
}
export async function refreshContribution() {
  if (!(await getCurrentUser())) redirect(await actionPath("/connexion"));
  revalidatePath("/[lang]/contribution", "page");
  redirect(await actionPath("/contribution"));
}

export async function refreshContributionReturn(form: FormData) {
  if (!(await getCurrentUser())) redirect(await actionPath("/connexion"));
  const sessionId = form.get("sessionId");
  if (typeof sessionId !== "string" || !/^cs_(test_|live_)?[A-Za-z0-9_]{1,240}$/.test(sessionId))
    redirect(await actionPath("/contribution"));
  revalidatePath("/[lang]/contribution/retour", "page");
  redirect(await actionPath("/contribution/retour?session_id=" + encodeURIComponent(sessionId)));
}
