// src/app/api/auth/logout/route.ts
// Clears HTTP-only cookie on logout

import { NextResponse } from "next/server";

// POST /api/auth/logout - Clear auth cookie
export async function POST() {
  const response = NextResponse.json({ success: true });

  const expireOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0, // Expire immediately
  };

  // Clear OIDC auth cookies
  response.cookies.set("oidc_access_token", "", expireOpts);
  response.cookies.set("oidc_refresh_token", "", expireOpts);
  response.cookies.set("oidc_client_id", "", expireOpts);
  response.cookies.set("oidc_issuer", "", expireOpts);

  // Clear default auth cookies
  response.cookies.set("user_session", "", expireOpts);
  response.cookies.set("user_refresh", "", expireOpts);

  return response;
}
