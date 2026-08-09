/**
 * Utility helper to resolve complaint image URLs
 * Handles base64 data URIs, absolute URLs, and relative static upload paths
 */

export const getImageUrl = (src?: string): string | undefined => {
  if (!src) return undefined;

  if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  const rawApiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
  const backendHost = rawApiUrl.replace(/\/api\/?$/, '');
  const cleanPath = src.startsWith('/') ? src : `/${src}`;

  return `${backendHost}${cleanPath}`;
};
