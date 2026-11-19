export const FORBIDDEN_TEXT: string[];
export const FORBIDDEN_FILE: RegExp;
export function scanDist(distDir: string): { files: number; problems: string[] };
