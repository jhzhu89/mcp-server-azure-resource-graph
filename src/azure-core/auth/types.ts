export interface JwtUserClaims {
  userObjectId: string;
  tenantId: string;
  expiresAt: number;
}

export interface OBOTokenInfo {
  tenantId: string;
  accessToken: string;
}

export interface CacheKeyInfo {
  tenantId: string;
  userObjectId: string;
}

export class ParsedJwtToken {
  constructor(
    public readonly claims: JwtUserClaims,
    public readonly rawToken: string,
    public readonly isValid: boolean = true
  ) {}

  get userObjectId(): string { return this.claims.userObjectId; }
  get tenantId(): string { return this.claims.tenantId; }
  get expiresAt(): number { return this.claims.expiresAt; }
  
  toOBOTokenInfo(): OBOTokenInfo {
    return {
      tenantId: this.tenantId,
      accessToken: this.rawToken
    };
  }
  
  toCacheKeyInfo(): CacheKeyInfo {
    return {
      tenantId: this.tenantId,
      userObjectId: this.userObjectId
    };
  }
}

export type AzureScope = string[];

export const AUTH_ERROR_CODES = {
  jwt_validation_failed: 'jwt_validation_failed',
  token_exchange_failed: 'token_exchange_failed',
  invalid_access_token: 'invalid_access_token',
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

export class AuthError extends Error {
  public readonly timestamp: Date;
  
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AuthError";
    this.timestamp = new Date();
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }
}
