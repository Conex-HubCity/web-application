import { getCurrentUser } from "@/lib/auth/session";
import { readProjectImage } from "@/lib/projects/images";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ imageId: string; variant: string }> },
) {
  const user = await getCurrentUser({ allowUnverified: true });
  const headers = {
    "Cache-Control": "private, no-store",
    Vary: "Cookie",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
  if (!user) return new Response(null, { status: 401, headers });
  if (!user.emailVerifiedAt) return new Response(null, { status: 403, headers });
  const { imageId, variant } = await params;
  const result = await readProjectImage(user.id, imageId, variant);
  if (!result) return new Response(null, { status: 404, headers });
  return new Response(new Uint8Array(result.buffer), {
    headers: {
      ...headers,
      "Content-Type": result.contentType,
      "Content-Length": String(result.buffer.length),
      "Content-Disposition": `inline; filename="project-image.${result.contentType === "image/png" ? "png" : "webp"}"`,
    },
  });
}
