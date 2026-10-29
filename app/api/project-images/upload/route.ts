import { getCurrentUser } from "@/lib/auth/session";
import { DomainError } from "@/lib/domain/policies";
import { uploadProjectImage } from "@/lib/projects/images";
const MAX_BODY = 6 * 1024 * 1024;
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
export async function POST(request: Request) {
  const user = await getCurrentUser({ allowUnverified: true });
  if (!user)
    return Response.json(
      { error: "Connectez-vous pour ajouter une image." },
      { status: 401, headers },
    );
  if (!user.emailVerifiedAt)
    return Response.json(
      { error: "Confirmez votre email avant de poursuivre." },
      { status: 403, headers },
    );
  let sameOrigin = false;
  try {
    sameOrigin =
      new URL(request.headers.get("origin") ?? "").origin === new URL(request.url).origin;
  } catch {
    /* Invalid or missing origin is rejected. */
  }
  if (!sameOrigin) return Response.json({ error: "Demande invalide." }, { status: 403, headers });
  const type = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data(?:;|$)/i.test(type))
    return Response.json(
      { error: "Choisissez une image JPG, PNG ou WebP valide." },
      { status: 400, headers },
    );
  const declared = request.headers.get("content-length");
  if (
    declared &&
    (!Number.isFinite(Number(declared)) || Number(declared) < 0 || Number(declared) > MAX_BODY)
  )
    return Response.json({ error: "L’image ne doit pas dépasser 5 Mo." }, { status: 413, headers });
  if (!request.body)
    return Response.json(
      { error: "Choisissez une image JPG, PNG ou WebP valide." },
      { status: 400, headers },
    );
  try {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > MAX_BODY) {
          await reader.cancel();
          return Response.json(
            { error: "L’image ne doit pas dépasser 5 Mo." },
            { status: 413, headers },
          );
        }
        chunks.push(part.value);
      }
    } finally {
      reader.releaseLock();
    }
    const form = await new Response(new Uint8Array(Buffer.concat(chunks)), {
      headers: { "Content-Type": type },
    }).formData();
    const files = form.getAll("image");
    if (files.length !== 1 || !(files[0] instanceof File))
      return Response.json(
        { error: "Choisissez une image JPG, PNG ou WebP valide." },
        { status: 400, headers },
      );
    const image = await uploadProjectImage(user.id, files[0]);
    return Response.json({ image }, { status: 201, headers });
  } catch (error) {
    const status =
      error instanceof DomainError
        ? error.code === "PROJECT_IMAGE_LIMIT"
          ? 429
          : error.code === "FOUNDER_UNAVAILABLE"
            ? 403
            : error.code === "PROJECT_IMAGE_TOO_LARGE"
              ? 413
              : 400
        : 500;
    return Response.json(
      {
        error:
          error instanceof DomainError
            ? error.message
            : "L’image n’a pas pu être enregistrée. Réessayez.",
      },
      { status, headers },
    );
  }
}
