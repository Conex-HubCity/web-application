import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { readProfilePhoto } from "@/lib/profile-photos";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ photoId: string; variant: string }> },
) {
  const headers = {
    "Cache-Control": "private, no-store",
    Vary: "Cookie",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
  const user = await getCurrentUser({ allowUnverified: true });
  if (!user) return new Response(null, { status: 401, headers });
  const { photoId, variant } = await params;
  const image = await readProfilePhoto(getDb(), user.id, photoId, variant);
  if (!image) return new Response(null, { status: 404, headers });
  return new Response(new Uint8Array(image), {
    headers: { ...headers, "Content-Type": "image/jpeg", "Content-Length": String(image.length) },
  });
}
