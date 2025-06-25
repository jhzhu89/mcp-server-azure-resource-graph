import { ResourceGraphClient } from "@azure/arm-resourcegraph";
import { type TokenCredential } from "@azure/identity";
import { LRUCache } from "lru-cache";
import type { UserContext } from "../types/auth.js";
import type { AzureAuthManager } from "../auth/azure-auth-manager.js";
import { AzureResourceClient } from "./azure-resource-client.js";

interface ClientCacheEntry {
  client: ResourceGraphClient;
  expiresAt: number;
}

export class ResourceGraphManager {
  private clientCache: LRUCache<string, ClientCacheEntry>;
  private authManager: AzureAuthManager;

  constructor(authManager: AzureAuthManager) {
    this.authManager = authManager;
    this.clientCache = new LRUCache<string, ClientCacheEntry>({
      max: 100,
      ttl: 60 * 60 * 1000,
    });
  }

  async getClient(userContext: UserContext): Promise<ResourceGraphClient> {
    const cacheKey = `rg_${userContext.tenantId}_${userContext.userObjectId}`;
    const cached = this.clientCache.get(cacheKey);
    
    const bufferMs = 1 * 60 * 1000;
    if (cached && cached.expiresAt > Date.now() + bufferMs) {
      return cached.client;
    }

    const tokenResult = await this.authManager.getResourceGraphToken(userContext);
     const credential = {
      getToken: async () => ({
        token: tokenResult.token,
        expiresOnTimestamp: tokenResult.expiresAt
      }),
    } as TokenCredential;

    const client = new ResourceGraphClient(credential);
    
    const entry: ClientCacheEntry = {
      client,
      expiresAt: tokenResult.expiresAt,
    };

    this.clientCache.set(cacheKey, entry);
    return client;
  }

  async getConfiguredClient(userContext: UserContext): Promise<AzureResourceClient> {
    const client = await this.getClient(userContext);
    return new AzureResourceClient(client);
  }
}
