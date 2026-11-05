import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { passwordLinkEmail, verificationEmail } from "../lib/mail/templates";

// Local examples only: no environment loading, SMTP connection or real token.
const output = resolve("exports/mail-previews");
const origin = "https://cnx.example.test";
const logo = pathToFileURL(resolve("public/assets/conex/cnx-logo-transparent.png")).href;
await mkdir(output, { recursive: true });
for (const locale of ["fr", "en"] as const) {
  const url = `${origin}/${locale}/definir-mot-de-passe#token=preview-only`;
  const examples = {
    [`otp-${locale}`]: verificationEmail({ locale, code: "012345" }, origin),
    [`reset-${locale}`]: passwordLinkEmail({ locale, url, purpose: "RESET" }),
    [`invitation-${locale}`]: passwordLinkEmail({ locale, url, purpose: "INVITATION" }),
  };
  for (const [name, content] of Object.entries(examples)) {
    await writeFile(
      resolve(output, `${name}.html`),
      content.html.replace(`${origin}/assets/conex/cnx-logo-transparent.png`, logo),
    );
    await writeFile(resolve(output, `${name}.txt`), content.text);
  }
}
console.log("Email previews written to exports/mail-previews (no email sent).");
