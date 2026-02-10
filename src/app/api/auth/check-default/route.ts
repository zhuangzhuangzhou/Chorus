// src/app/api/auth/check-default/route.ts
// Check if default auth is enabled

import { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { success } from "@/lib/api-response";
import { isDefaultAuthEnabled, getDefaultUserEmail } from "@/lib/default-auth";

export const GET = withErrorHandler(async (_request: NextRequest) => {
  const enabled = isDefaultAuthEnabled();
  const email = enabled ? getDefaultUserEmail() : undefined;

  return success({ enabled, email });
});
