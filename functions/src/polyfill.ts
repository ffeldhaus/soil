// Polyfill $localize for server-side use of shared constants
(global as any).$localize = (parts: TemplateStringsArray, ...substitutions: any[]) => {
  return parts.reduce((acc, part, i) => acc + (substitutions[i - 1] || '') + part);
};
