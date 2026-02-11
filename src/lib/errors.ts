// src/lib/errors.ts
// Business error classes for domain-specific error handling

export class AlreadyClaimedError extends Error {
  constructor(entity: string) {
    super(`${entity} is already claimed`);
    this.name = "AlreadyClaimedError";
  }
}

export class NotClaimedError extends Error {
  constructor(entity: string) {
    super(`${entity} is not currently claimed`);
    this.name = "NotClaimedError";
  }
}

export function isPrismaNotFound(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2025"
  );
}
