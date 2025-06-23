import { ResourceGraphClient } from "@azure/arm-resourcegraph";
import { type TokenCredential } from "@azure/identity";
import { LRUCache } from "lru-cache";
import type { UserContext } from "../types/auth.js";
import type { AzureAuthManager } from "../auth/azure-auth-manager.js";

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

  async queryResources(client: ResourceGraphClient, query: string) {
    const request = {
      query: query,
      options: {
        resultFormat: "objectArray" as const,
      },
    };

    const result = await client.resources(request);
    return {
      count: result.count || 0,
      data: result.data || [],
      totalRecords: result.totalRecords || 0,
      query: query,
    };
  }
}
