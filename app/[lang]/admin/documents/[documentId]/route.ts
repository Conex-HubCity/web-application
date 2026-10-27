import { isLocale } from "@/lib/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { readAdminDocument } from "@/lib/admin/documents";
import { DomainError } from "@/lib/domain/policies";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string; lang: string }> },
) {
  const user = await getCurrentUser({ allowUnverified: true });
  const privateHeaders = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (!user) return new Response(null, { status: 401, headers: privateHeaders });
  if (!user.emailVerifiedAt) return new Response(null, { status: 403, headers: privateHeaders });
  try {
    const { documentId, lang } = await params;
    if (!isLocale(lang)) return new Response(null, { status: 404, headers: privateHeaders });
    const { buffer, name } = await readAdminDocument(user.id, documentId);
    const filename = encodeURIComponent(name.replace(/[\u0000-\u001f\u007f]/g, "")).replace(
      /[!'()*]/g,
      (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    return new Response(new Uint8Array(buffer), {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="document"; filename*=UTF-8''${filename}`,
        "Content-Length": String(buffer.length),
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    if (error instanceof DomainError)
      return new Response(null, {
        status: error.code === "ADMIN_REQUIRED" ? 403 : 404,
        headers: privateHeaders,
      });
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return new Response(null, { status: 404, headers: privateHeaders });
    console.error(
      "Admin document unavailable",
      error instanceof Error ? error.name : "UnknownError",
    );
    return new Response(null, { status: 500, headers: privateHeaders });
  }
}
