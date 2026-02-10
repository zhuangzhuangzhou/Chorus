// src/types/admin.ts
// Super Admin 相关类型定义

// Company 列表项
export interface CompanyListItem {
  uuid: string;
  name: string;
  emailDomains: string[];
  oidcEnabled: boolean;
  userCount: number;
  agentCount: number;
  createdAt: string;
}

// Company 详情
export interface CompanyDetail extends CompanyListItem {
  oidcIssuer: string | null;
  oidcClientId: string | null;
  updatedAt: string;
}

// Company 创建输入
export interface CompanyCreateInput {
  name: string;
  emailDomains?: string[];
  oidcIssuer?: string;
  oidcClientId?: string;
}

// Company 更新输入
export interface CompanyUpdateInput {
  name?: string;
  emailDomains?: string[];
  oidcIssuer?: string | null;
  oidcClientId?: string | null;
  oidcEnabled?: boolean;
}

// 邮箱识别响应
export interface IdentifyResponse {
  type: "super_admin" | "oidc" | "default_auth" | "not_found";
  company?: {
    uuid: string;
    name: string;
    oidcIssuer: string;
    oidcClientId: string;
  };
  message?: string;
}
