export interface UserContext {
  userObjectId: string;
  tenantId: string;
  accessToken: string;
}

export interface CachedUserInfo {
  userObjectId: string;
  tenantId: string;
  objectId: string;
  expiresAt: number;
}

export interface CachedToken {
  token: string;
  expiresAt: number;
}

export enum AuthErrorCode {
  JWT_VALIDATION_FAILED = "JWT_VALIDATION_FAILED",
  TOKEN_EXCHANGE_FAILED = "TOKEN_EXCHANGE_FAILED",
  INVALID_ACCESS_TOKEN = "INVALID_ACCESS_TOKEN",
}

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    public userObjectId?: string,
    public tenantId?: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}
