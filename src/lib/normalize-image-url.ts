/**
 * Misma lógica que newayzi-frontend-v2: corrige URLs duplicadas del backend.
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string" || url.trim() === "") {
    return "/placeholder.png";
  }
  const trimmed = url.trim();

  const doubleUrlMatch = trimmed.match(/https%3A\/([^/]+\.[^/]+\.s3\.amazonaws\.com\/.+)/);
  if (doubleUrlMatch) {
    return `https://${doubleUrlMatch[1]}`;
  }

  const doubleUrlMatch2 = trimmed.match(/^(https?:\/\/[^/]+)\/.*(https:\/\/[^/]+\.s3\.amazonaws\.com\/.+)$/);
  if (doubleUrlMatch2) {
    return doubleUrlMatch2[2];
  }

  return trimmed;
}
