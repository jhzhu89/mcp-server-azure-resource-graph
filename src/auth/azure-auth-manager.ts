import jwt from "jsonwebtoken";
import { ConfidentialClientApplication } from "@azure/msal-node";
import type { OnBehalfOfRequest } from "@azure/msal-node";
import { AuthError, AuthErrorCode } from "../types/auth.js";
import type { UserContext, CachedUserInfo } from "../types/auth.js";

export class AzureAuthManager {
  constructor() {
  }

  async getResourceGraphToken(userContext: UserContext): Promise<{ token: string; expiresAt: number }> {
    try {
      const oboRequest: OnBehalfOfRequest = {
        oboAssertion: userContext.accessToken,
        scopes: ["https://management.azure.com/.default"],
      };

      const clientId = process.env.AZURE_CLIENT_ID || "";
      const clientSecret = process.env.AZURE_CLIENT_SECRET || "";

      const msalClient = new ConfidentialClientApplication({
        auth: {
          clientId,
          clientSecret,
          authority: `https://login.microsoftonline.com/${userContext.tenantId}`,
        },
      });

      const response = await msalClient.acquireTokenOnBehalfOf(oboRequest);

      if (!response?.accessToken) {
        throw new Error("No access token received from OBO flow");
      }

      const expiresAt = response.expiresOn?.getTime() || Date.now() + 60 * 60 * 1000;
      
      return {
        token: response.accessToken,
        expiresAt,
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

  async extractUserInfo(accessToken: string): Promise<CachedUserInfo> {
    try {
      const decoded = jwt.decode(accessToken) as any;

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

  extractTokenFromArgs(args: any): string | null {
    if (args && args.access_token) {
      console.log('Access token found in arguments');
      return args.access_token;
    }
    return null;
  }
}