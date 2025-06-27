import { OnBehalfOfCredential, type TokenCredential, type OnBehalfOfCredentialCertificateOptions, type OnBehalfOfCredentialSecretOptions } from "@azure/identity";
import { type OBOTokenInfo, type AzureScope, AuthError, AUTH_ERROR_CODES } from "./types.js";
import { credentialLogger } from "../logger.js";

export interface AzureCredentialConfig {
  clientId: string;
  clientSecret?: string;
  certificatePath?: string;
  certificatePassword?: string;
  tenantId: string;
}

export interface OBOCredentialProvider {
  createCredential(tokenInfo: OBOTokenInfo, scope: AzureScope): Promise<{ credential: TokenCredential; expiresAt: number }>;
}

export class AzureOBOCredentialProvider implements OBOCredentialProvider {
  constructor(private config: AzureCredentialConfig) {}

  async createCredential(tokenInfo: OBOTokenInfo, scope: AzureScope): Promise<{ credential: TokenCredential; expiresAt: number }> {
    credentialLogger.debug({ 
      tenantId: tokenInfo.tenantId, 
      scope: scope.join(', ') 
    }, 'Creating OBO credential');
    
    const tokenResult = await this.acquireToken(tokenInfo, scope);
    
    const credential = {
      getToken: async () => ({
        token: tokenResult.token,
        expiresOnTimestamp: tokenResult.expiresAt
      }),
    } as TokenCredential;

    credentialLogger.debug({ 
      tenantId: tokenInfo.tenantId,
      expiresAt: new Date(tokenResult.expiresAt).toISOString() 
    }, 'OBO credential created');

    return {
      credential,
      expiresAt: tokenResult.expiresAt
    };
  }

  private async acquireToken(tokenInfo: OBOTokenInfo, scope: AzureScope): Promise<{ token: string; expiresAt: number }> {
    try {
      const credential = this.createOBOCredential(tokenInfo);
      const tokenResponse = await credential.getToken(scope);
      
      if (!tokenResponse?.token) {
        throw new Error("Azure OBO flow returned no access token");
      }
      
      return {
        token: tokenResponse.token,
        expiresAt: tokenResponse.expiresOnTimestamp
      };
    } catch (error) {
      credentialLogger.error({ 
        tenantId: tokenInfo.tenantId,
        scope: scope.join(', '),
        error: error instanceof Error ? error.message : String(error)
      }, 'Token acquisition failed');
      throw new AuthError(
        AUTH_ERROR_CODES.token_exchange_failed,
        `Failed to acquire token for scope ${scope.join(', ')}: ${error}`
      );
    }
  }

  private createOBOCredential(tokenInfo: OBOTokenInfo): OnBehalfOfCredential {
    const baseOptions = {
      tenantId: tokenInfo.tenantId,
      clientId: this.config.clientId,
      userAssertionToken: tokenInfo.accessToken
    };

    if (this.config.certificatePath) {
      const options: OnBehalfOfCredentialCertificateOptions = {
        ...baseOptions,
        certificatePath: this.config.certificatePath
      };
      return new OnBehalfOfCredential(options);
    } else if (this.config.clientSecret) {
      const options: OnBehalfOfCredentialSecretOptions = {
        ...baseOptions,
        clientSecret: this.config.clientSecret
      };
      return new OnBehalfOfCredential(options);
    } else {
      throw new Error("Azure authentication requires either client certificate path or client secret");
    }
  }
}
