// src/app/api/auth/identify/route.ts
// 邮箱识别 API - 判断是 Super Admin 还是 Company OIDC

import { NextRequest } from "next/server";
import { withErrorHandler, parseBody } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { isSuperAdminEmail } from "@/lib/super-admin";
import { isDefaultAuthEnabled, getDefaultUserEmail } from "@/lib/default-auth";
import * as companyService from "@/services/company.service";
import { IdentifyResponse } from "@/types/admin";

interface IdentifyRequest {
  email: string;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseBody<IdentifyRequest>(request);

  if (!body.email || typeof body.email !== "string") {
    return errors.validationError({ email: "Email is required" });
  }

  const email = body.email.trim().toLowerCase();

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return errors.validationError({ email: "Invalid email format" });
  }

  // 检查是否是 Super Admin
  if (isSuperAdminEmail(email)) {
    const response: IdentifyResponse = {
      type: "super_admin",
    };
    return success(response);
  }

  // Check if default auth is enabled and email matches
  if (isDefaultAuthEnabled() && email === getDefaultUserEmail()) {
    const response: IdentifyResponse = {
      type: "default_auth",
    };
    return success(response);
  }

  // 查找 Company by 邮箱域名
  const company = await companyService.getCompanyByEmailDomain(email);

  if (company && company.oidcIssuer && company.oidcClientId) {
    const response: IdentifyResponse = {
      type: "oidc",
      company: {
        uuid: company.uuid,
        name: company.name,
        oidcIssuer: company.oidcIssuer,
        oidcClientId: company.oidcClientId,
      },
    };
    return success(response);
  }

  // 未找到对应的 Company
  const response: IdentifyResponse = {
    type: "not_found",
    message: "No organization found for this email domain",
  };
  return success(response);
});
