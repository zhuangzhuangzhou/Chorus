// src/lib/auth.ts
// 认证中间件和工具函数 (ARCHITECTURE.md §6)
// UUID-Based Architecture: All IDs are UUIDs

import { NextRequest, NextResponse } from "next/server";
import { extractApiKey, validateApiKey } from "./api-key";
import { errors } from "./api-response";
import type {
  AuthContext,
  AgentAuthContext,
  UserAuthContext,
  SuperAdminAuthContext,
  AgentRole,
} from "@/types/auth";
import { getSuperAdminFromRequest } from "./super-admin";
import { getUserSessionFromRequest } from "./user-session";
import { verifyOidcAccessToken, isOidcToken } from "./oidc-auth";

// 从请求获取认证上下文 (UUID-based)
export async function getAuthContext(
  request: NextRequest
): Promise<AuthContext | null> {
  const authHeader = request.headers.get("authorization");

  // 1. 尝试 Bearer Token 认证
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.substring(7).trim();

    // 1a. API Key 认证（Agent）- API Key 以 "cho_" 开头
    if (token.startsWith("cho_")) {
      const result = await validateApiKey(token);
      if (result.valid && result.agent) {
        const agentContext: AgentAuthContext = {
          type: "agent",
          companyUuid: result.agent.companyUuid,
          actorUuid: result.agent.uuid,
          roles: result.agent.roles as AgentRole[],
          ownerUuid: result.agent.ownerUuid ?? undefined,
          agentName: result.agent.name,
        };
        return agentContext;
      }
    }

    // 1b. OIDC Access Token 认证（普通用户）
    if (isOidcToken(token)) {
      const userContext = await verifyOidcAccessToken(token);
      if (userContext) {
        return userContext;
      }
    }

    // 1c. Chorus JWT Token 认证（SuperAdmin 或旧系统兼容）
    const userSession = await getUserSessionFromRequest(request);
    if (userSession) {
      return userSession;
    }
  }

  // 2. 尝试 Session Cookie 认证 — 无 Authorization header 时
  const userSession = await getUserSessionFromRequest(request);
  if (userSession) {
    return userSession;
  }

  // 3. 尝试 OIDC Access Token Cookie 认证（EventSource 等无法发送 Authorization header 的场景）
  const oidcCookieToken = request.cookies.get("oidc_access_token")?.value;
  if (oidcCookieToken && isOidcToken(oidcCookieToken)) {
    const oidcContext = await verifyOidcAccessToken(oidcCookieToken);
    if (oidcContext) {
      return oidcContext;
    }
  }

  // 4. Fallback: Header 模拟用户认证（开发用）- UUID-based
  const userUuidHeader = request.headers.get("x-user-uuid");
  const companyUuidHeader = request.headers.get("x-company-uuid");

  if (userUuidHeader && companyUuidHeader) {
    const userContext: UserAuthContext = {
      type: "user",
      companyUuid: companyUuidHeader,
      actorUuid: userUuidHeader,
      email: request.headers.get("x-user-email") || undefined,
      name: request.headers.get("x-user-name") || undefined,
    };
    return userContext;
  }

  return null;
}

// 检查是否为 Agent
export function isAgent(ctx: AuthContext): ctx is AgentAuthContext {
  return ctx.type === "agent";
}

// 检查是否为 User
export function isUser(ctx: AuthContext): ctx is UserAuthContext {
  return ctx.type === "user";
}

// 检查 Agent 是否有特定角色
export function hasRole(ctx: AuthContext, role: AgentRole): boolean {
  if (!isAgent(ctx)) return false;
  return ctx.roles.includes(role);
}

// 检查是否为 PM Agent
export function isPmAgent(ctx: AuthContext): boolean {
  return hasRole(ctx, "pm");
}

// 检查是否为 Developer Agent
export function isDeveloperAgent(ctx: AuthContext): boolean {
  return hasRole(ctx, "developer");
}

// 要求认证的装饰器工厂
export function requireAuth<T>(
  handler: (
    request: NextRequest,
    context: { params: Promise<T> },
    auth: AuthContext
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: { params: Promise<T> }
  ): Promise<NextResponse> => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }
    return handler(request, context, auth);
  };
}

// 要求用户认证
export function requireUser<T>(
  handler: (
    request: NextRequest,
    context: { params: Promise<T> },
    auth: UserAuthContext
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: { params: Promise<T> }
  ): Promise<NextResponse> => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }
    if (!isUser(auth)) {
      return errors.forbidden("This operation requires user authentication");
    }
    return handler(request, context, auth);
  };
}

// 要求特定 Agent 角色
export function requireAgentRole<T>(
  role: AgentRole,
  handler: (
    request: NextRequest,
    context: { params: Promise<T> },
    auth: AgentAuthContext
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: { params: Promise<T> }
  ): Promise<NextResponse> => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }
    if (!isAgent(auth)) {
      return errors.forbidden("This operation requires agent authentication");
    }
    if (!hasRole(auth, role)) {
      return errors.forbidden(`This operation requires ${role} role`);
    }
    return handler(request, context, auth);
  };
}

// 检查是否是资源的认领者 (UUID-based)
export function isAssignee(
  ctx: AuthContext,
  assigneeType: string | null,
  assigneeUuid: string | null
): boolean {
  if (!assigneeType || !assigneeUuid) return false;

  if (isUser(ctx)) {
    // 用户直接匹配
    if (assigneeType === "user" && assigneeUuid === ctx.actorUuid) {
      return true;
    }
  }

  if (isAgent(ctx)) {
    // Agent 直接匹配
    if (assigneeType === "agent" && assigneeUuid === ctx.actorUuid) {
      return true;
    }
    // Agent 的 Owner 认领（"Assign to myself"）
    if (
      assigneeType === "user" &&
      ctx.ownerUuid &&
      assigneeUuid === ctx.ownerUuid
    ) {
      return true;
    }
  }

  return false;
}

// 检查是否为 Super Admin
export function isSuperAdmin(
  ctx: AuthContext | SuperAdminAuthContext
): ctx is SuperAdminAuthContext {
  return ctx.type === "super_admin";
}

// 要求 Super Admin 认证
export function requireSuperAdmin<T>(
  handler: (
    request: NextRequest,
    context: { params: Promise<T> },
    auth: SuperAdminAuthContext
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: { params: Promise<T> }
  ): Promise<NextResponse> => {
    const auth = await getSuperAdminFromRequest(request);
    if (!auth) {
      return errors.unauthorized("Super Admin authentication required");
    }
    return handler(request, context, auth);
  };
}
