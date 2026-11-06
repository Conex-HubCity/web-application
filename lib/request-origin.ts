type RequestOriginInput = Pick<Request, "headers" | "url">;
type RequestOriginEnv = {
  APP_URL?: string;
  NODE_ENV?: string;
};

function parseOrigin(value: string | null) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function hasAllowedRequestOrigin(
  request: RequestOriginInput,
  env: RequestOriginEnv = process.env,
) {
  const requestOrigin = parseOrigin(request.headers.get("origin"));
  if (!requestOrigin) return false;

  const configuredOrigin = parseOrigin(env.APP_URL ?? null);
  if (env.NODE_ENV === "production") {
    return configuredOrigin !== null && requestOrigin === configuredOrigin;
  }

  return requestOrigin === (configuredOrigin ?? parseOrigin(request.url));
}
