/**
 * Pure URL parser for OAuth callback parameters.
 * Works seamlessly in React Native, Web, and backend Node.js environments.
 */
export function parseOAuthUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};

  // Check query string (?...)
  const queryIndex = url.indexOf('?');
  if (queryIndex !== -1) {
    const queryPart = url.slice(queryIndex + 1).split('#')[0];
    queryPart.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v);
    });
  }

  // Check hash fragment (#...)
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    const hashPart = url.slice(hashIndex + 1);
    hashPart.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v);
    });
  }

  return params;
}

