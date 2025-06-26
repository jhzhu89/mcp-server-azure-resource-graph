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

export class ResourceGraphClientManager {
  private clientCache: LRUCache<string, ClientCacheEntry>;
  private pendingRequests: Map<string, Promise<ResourceGraphClient>>;
  private authManager: AzureAuthManager;

  constructor(authManager: AzureAuthManager) {
    this.authManager = authManager;
    this.pendingRequests = new Map();
    this.clientCache = new LRUCache<string, ClientCacheEntry>({
      max: 100,
      ttl: 60 * 60 * 1000,
    });
  }

  async getClient(userContext: UserContext): Promise<ResourceGraphClient> {
    const cacheKey = this.buildCacheKey(userContext);
    
    const cached = this.getCachedClient(cacheKey);
    if (cached) return cached;
    
    const existingPromise = this.pendingRequests.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }
    
    const promise = this.createClientInternal(userContext, cacheKey);
    this.pendingRequests.set(cacheKey, promise);
    
    try {
      return await promise;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private buildCacheKey(userContext: UserContext): string {
    return `rg_${userContext.tenantId}_${userContext.userObjectId}`;
  }

  private getCachedClient(cacheKey: string): ResourceGraphClient | null {
    const cached = this.clientCache.get(cacheKey);
    const bufferMs = 1 * 60 * 1000;
    
    if (cached && cached.expiresAt > Date.now() + bufferMs) {
      return cached.client;
    }
    
    return null;
  }

  private async createClientInternal(userContext: UserContext, cacheKey: string): Promise<ResourceGraphClient> {
    const cached = this.getCachedClient(cacheKey);
    if (cached) return cached;

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
