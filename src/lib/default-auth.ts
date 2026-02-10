// src/lib/default-auth.ts
// Default User Auth helpers for simple login without OIDC

export function isDefaultAuthEnabled(): boolean {
  return !!(process.env.DEFAULT_USER && process.env.DEFAULT_PASSWORD);
}

export function getDefaultUserEmail(): string | null {
  return process.env.DEFAULT_USER?.trim().toLowerCase() || null;
}

export async function verifyDefaultPassword(inputPassword: string): Promise<boolean> {
  const envPassword = process.env.DEFAULT_PASSWORD;
  if (!envPassword) return false;
  // Simple string comparison since env var is plain text
  return inputPassword === envPassword;
}
