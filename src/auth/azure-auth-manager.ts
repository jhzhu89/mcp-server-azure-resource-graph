import { OnBehalfOfCredential } from "@azure/identity";
import { AuthError, AuthErrorCode } from "../types/auth.js";
import type { UserContext, CachedUserInfo } from "../types/auth.js";

interface TokenCache {
  token: string;
  expiresAt: number;
}

export class AzureAuthManager {
  private tokenCache = new Map<string, TokenCache>();

  constructor() {
  }

  async getResourceGraphToken(userContext: UserContext): Promise<{ token: string; expiresAt: number }> {
    const cacheKey = `${userContext.tenantId}_${userContext.userObjectId}`;
    
    const cached = this.tokenCache.get(cacheKey);
    if (cached && this.isValidCache(cached)) {
      return { token: cached.token, expiresAt: cached.expiresAt };
    }
    
    const tokenResult = await this.acquireNewToken(userContext);
    
    this.tokenCache.set(cacheKey, {
      token: tokenResult.token,
      expiresAt: tokenResult.expiresAt
    });
    
    return tokenResult;
  }
  
  private isValidCache(cached: TokenCache): boolean {
    return cached.expiresAt > Date.now() + 60000;
  }
  
  private async acquireNewToken(userContext: UserContext): Promise<{ token: string; expiresAt: number }> {
    try {
      const credential = this.createCredential(userContext);
      const tokenResponse = await credential.getToken(["https://management.azure.com/.default"]);
      
      if (!tokenResponse?.token) {
        throw new Error("No access token received from OBO flow");
      }
      
      return {
        token: tokenResponse.token,
        expiresAt: tokenResponse.expiresOnTimestamp
      };
    } catch (error) {
      throw new AuthError(
        AuthErrorCode.TOKEN_EXCHANGE_FAILED,
        `Failed to acquire Resource Graph token: ${error}`,
        userContext.userObjectId,
        userContext.tenantId
      );
    }
  }
  
  private createCredential(userContext: UserContext): OnBehalfOfCredential {
    const clientId = process.env.AZURE_CLIENT_ID!;
    const certPath = process.env.AZURE_CLIENT_CERTIFICATE_PATH;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    
    const options: any = {
      tenantId: userContext.tenantId,
      clientId,
      userAssertionToken: userContext.accessToken
    };
    
    if (certPath) {
      options.certificatePath = certPath;
    } else if (clientSecret) {
      options.clientSecret = clientSecret;
    } else {
      throw new Error("Neither certificate nor client secret configured");
    }
    
    return new OnBehalfOfCredential(options);
  }

  async extractUserInfo(accessToken: string): Promise<CachedUserInfo> {
    try {
      const base64Payload = accessToken.split('.')[1];
      if (!base64Payload) {
        throw new Error("Invalid JWT token structure");
      }
      
      const decoded = JSON.parse(Buffer.from(base64Payload, 'base64').toString());

      if (!decoded || !decoded.oid || !decoded.tid) {
        throw new Error("Invalid JWT token structure");
      }

      if (!decoded.exp || decoded.exp * 1000 <= Date.now()) {
        throw new Error("JWT token has expired");
      }

      return {
        userObjectId: decoded.oid,
        tenantId: decoded.tid,
        objectId: decoded.oid,
        expiresAt: decoded.exp * 1000,
      };
    } catch (error) {
      throw new AuthError(
        AuthErrorCode.JWT_VALIDATION_FAILED,
        `Failed to extract user info from JWT: ${error}`
      );
    }
  }

  async validateJwtToken(accessToken: string): Promise<boolean> {
    try {
      const userInfo = await this.extractUserInfo(accessToken);
      return userInfo.expiresAt > Date.now();
    } catch (error) {
      return false;
    }
  }

  async createUserContext(accessToken: string): Promise<UserContext> {
    const isValid = await this.validateJwtToken(accessToken);
    if (!isValid) {
      throw new AuthError(
        AuthErrorCode.JWT_VALIDATION_FAILED,
        "Invalid or expired JWT token"
      );
    }

    const userInfo = await this.extractUserInfo(accessToken);

    return {
      userObjectId: userInfo.userObjectId,
      tenantId: userInfo.tenantId,
      accessToken,
    };
  }

  extractTokenFromRequest(req: any): string | null {
    console.log('extractTokenFromRequest called with:', {
      type: typeof req,
      keys: req ? Object.keys(req) : 'null/undefined',
      hasHeaders: req && req.headers ? 'yes' : 'no',
      hasBody: req && req.body ? 'yes' : 'no'
    });

    if (!req) {
      console.log('No request object provided');
      return null;
    }

    if (req.headers) {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      console.log('Auth header found:', authHeader ? 'yes' : 'no');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        console.log('Bearer token extracted from header');
        return authHeader.substring(7);
      }
    }

    console.log("No access token found in request");
    return null;
  }
}