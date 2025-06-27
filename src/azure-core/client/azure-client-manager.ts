import { LRUCache } from "lru-cache";
import { type CacheKeyInfo, ParsedJwtToken } from "../auth/types.js";
import { type OBOCredentialProvider } from "../auth/azure-credential-provider.js";
import { type AzureClientFactory } from "./types.js";
import { clientLogger } from "../logger.js";

export interface ClientManagerConfig {
  maxCacheSize: number;
  ttlMs: number;
  bufferMs: number;
  cacheKeyPrefix: string;
  maxAge?: number;
}

interface ClientCacheEntry<TClient> {
  client: TClient;
  expiresAt: number;
}

function isTokenValid(expiresAt: number, bufferMs: number = 60000): boolean {
  return expiresAt > Date.now() + bufferMs;
}

export class AzureClientManager<TClient, TOptions = void> {
  private clientCache: LRUCache<string, ClientCacheEntry<TClient>>;
  private pendingRequests: Map<string, Promise<TClient>>;
  private config: ClientManagerConfig;

  constructor(
    private credentialProvider: OBOCredentialProvider,
    private clientFactory: AzureClientFactory<TClient, TOptions>,
    config: ClientManagerConfig
  ) {
    this.config = config;
    this.pendingRequests = new Map();
    
    this.clientCache = new LRUCache<string, ClientCacheEntry<TClient>>({
      max: this.config.maxCacheSize,
      ttl: this.config.ttlMs,
    });

    clientLogger.debug({ 
      maxCacheSize: this.config.maxCacheSize, 
      ttlMs: this.config.ttlMs,
      scope: this.clientFactory.scope 
    }, 'Client manager initialized');
  }

  async getClient(parsedToken: ParsedJwtToken, options?: TOptions): Promise<TClient> {
    const cacheKeyInfo = parsedToken.toCacheKeyInfo();
    const cacheKey = this.createCacheKey(cacheKeyInfo, options);
    
    clientLogger.debug({ 
      userObjectId: parsedToken.userObjectId, 
      tenantId: parsedToken.tenantId,
      cacheKey: cacheKey.substring(0, 50) + '...'
    }, 'Cache lookup');
    
    const cached = this.getCachedClient(cacheKey);
    if (cached) {
      clientLogger.debug({ 
        userObjectId: parsedToken.userObjectId,
        cacheSize: this.clientCache.size 
      }, 'Cache hit');
      return cached;
    }
    
    const existingPromise = this.pendingRequests.get(cacheKey);
    if (existingPromise) {
      clientLogger.debug({ 
        userObjectId: parsedToken.userObjectId 
      }, 'Found pending request');
      return existingPromise;
    }
    
    clientLogger.debug({ 
      userObjectId: parsedToken.userObjectId 
    }, 'Cache miss, creating new client');
    
    const promise = this.createClientInternal(parsedToken, cacheKey, options);
    this.pendingRequests.set(cacheKey, promise);
    
    try {
      return await promise;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private getCachedClient(cacheKey: string): TClient | null {
    const cached = this.clientCache.get(cacheKey);
    
    if (cached && isTokenValid(cached.expiresAt, this.config.bufferMs)) {
      return cached.client;
    }
    
    return null;
  }

  private async createClientInternal(
    parsedToken: ParsedJwtToken, 
    cacheKey: string,
    options?: TOptions
  ): Promise<TClient> {
    const cached = this.getCachedClient(cacheKey);
    if (cached) return cached;

    const oboTokenInfo = parsedToken.toOBOTokenInfo();
    const { credential, expiresAt } = await this.credentialProvider.createCredential(oboTokenInfo, this.clientFactory.scope);
    const client = this.clientFactory.createClient(credential, options);
    
    const entry: ClientCacheEntry<TClient> = {
      client,
      expiresAt,
    };

    const cacheOptions: any = {};
    if (this.config.maxAge) {
      cacheOptions.ttl = Math.min(this.config.ttlMs, expiresAt - Date.now());
    }

    this.clientCache.set(cacheKey, entry, cacheOptions);
    
    clientLogger.debug({ 
      userObjectId: parsedToken.userObjectId,
      expiresAt: new Date(expiresAt).toISOString(),
      cacheSize: this.clientCache.size 
    }, 'Client created and cached');
    
    return client;
  }

  private createCacheKey(cacheKeyInfo: CacheKeyInfo, options?: TOptions): string {
    const parts = [this.config.cacheKeyPrefix, cacheKeyInfo.tenantId, cacheKeyInfo.userObjectId];
    
    const fingerprint = this.clientFactory.getClientFingerprint?.(options);
    if (fingerprint) {
      parts.push(fingerprint);
    }
    
    return parts.join('::');
  }
}
