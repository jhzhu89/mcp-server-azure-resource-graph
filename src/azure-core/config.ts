import { type JwtConfig } from "./auth/jwt-token-validator.js";
import { type ClientManagerConfig } from "./client/azure-client-manager.js";
import { type AzureCredentialConfig } from "./auth/azure-credential-provider.js";
import { configLogger } from "./logger.js";

export interface AzureCoreConfig {
  azure: {
    clientId: string;
    clientSecret?: string;
    certificatePath?: string;
    certificatePassword?: string;
    tenantId: string;
  };
  jwt: {
    audience?: string;
    issuer?: string;
    clockTolerance: number;
    cacheMaxAge: number;
    jwksRequestsPerMinute: number;
  };
  cache: {
    maxCacheSize: number;
    ttlMs: number;
    bufferMs: number;
    cacheKeyPrefix: string;
    maxMemoryMb: number;
  };
}

export function loadAzureCoreConfig(): AzureCoreConfig {
  configLogger.debug({}, 'Loading Azure core config');
  
  const requiredEnvVars = ["AZURE_CLIENT_ID", "AZURE_TENANT_ID"];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Required environment variable ${envVar} is not set`);
    }
  }

  const hasSecret = !!process.env.AZURE_CLIENT_SECRET;
  const hasCertificate = !!process.env.AZURE_CLIENT_CERTIFICATE_PATH;

  if (!hasSecret && !hasCertificate) {
    throw new Error(
      "Either AZURE_CLIENT_SECRET or AZURE_CLIENT_CERTIFICATE_PATH must be set"
    );
  }

  if (hasSecret && hasCertificate) {
    throw new Error(
      "Only one of AZURE_CLIENT_SECRET or AZURE_CLIENT_CERTIFICATE_PATH should be set"
    );
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  
  configLogger.debug({ 
    nodeEnv,
    authMethod: hasSecret ? 'secret' : 'certificate',
    tenantId: process.env.AZURE_TENANT_ID
  }, 'Config loaded');
  
  return {
    azure: {
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      certificatePath: process.env.AZURE_CLIENT_CERTIFICATE_PATH,
      certificatePassword: process.env.AZURE_CLIENT_CERTIFICATE_PASSWORD,
      tenantId: process.env.AZURE_TENANT_ID!,
    },
    jwt: {
      audience: process.env.JWT_AUDIENCE,
      issuer: process.env.JWT_ISSUER,
      clockTolerance: parseInt(process.env.JWT_CLOCK_TOLERANCE || "300"),
      cacheMaxAge: parseInt(process.env.JWT_CACHE_MAX_AGE || "86400000"),
      jwksRequestsPerMinute: parseInt(process.env.JWKS_REQUESTS_PER_MINUTE || "10"),
    },
    cache: {
      maxCacheSize: parseInt(process.env.CACHE_MAX_SIZE || (nodeEnv === 'production' ? "1000" : "100")),
      ttlMs: parseInt(process.env.CACHE_TTL_MS || "3600000"),
      bufferMs: parseInt(process.env.CACHE_BUFFER_MS || "60000"),
      cacheKeyPrefix: process.env.CACHE_KEY_PREFIX || "client",
      maxMemoryMb: parseInt(process.env.CACHE_MAX_MEMORY_MB || "50"),
    },
  };
}

export function validateAzureCoreConfig(config: AzureCoreConfig): void {
  if (!config.azure.clientId || !config.azure.tenantId) {
    throw new Error("Azure configuration is incomplete");
  }

  const hasSecret = !!config.azure.clientSecret;
  const hasCertificate = !!config.azure.certificatePath;

  if (!hasSecret && !hasCertificate) {
    throw new Error("Either clientSecret or certificatePath must be provided");
  }

  if (hasSecret && hasCertificate) {
    throw new Error(
      "Only one of clientSecret or certificatePath should be provided"
    );
  }

  if (
    config.cache.maxCacheSize <= 0 ||
    config.cache.ttlMs <= 0 ||
    config.cache.bufferMs < 0 ||
    config.cache.maxMemoryMb <= 0
  ) {
    throw new Error("Cache configuration must have positive values");
  }

  if (
    config.jwt.clockTolerance < 0 ||
    config.jwt.cacheMaxAge <= 0 ||
    config.jwt.jwksRequestsPerMinute <= 0
  ) {
    throw new Error("JWT configuration must have valid values");
  }
}

let cachedConfig: AzureCoreConfig | null = null;

export function getAzureCoreConfig(): AzureCoreConfig {
  if (!cachedConfig) {
    cachedConfig = loadAzureCoreConfig();
    validateAzureCoreConfig(cachedConfig);
  }
  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}

export function createJwtConfig(config: AzureCoreConfig): JwtConfig {
  return {
    clientId: config.azure.clientId,
    tenantId: config.azure.tenantId,
    audience: config.jwt.audience,
    issuer: config.jwt.issuer,
    clockTolerance: config.jwt.clockTolerance,
    cacheMaxAge: config.jwt.cacheMaxAge,
    jwksRequestsPerMinute: config.jwt.jwksRequestsPerMinute,
  };
}

export function createClientManagerConfig(config: AzureCoreConfig): ClientManagerConfig {
  return {
    maxCacheSize: config.cache.maxCacheSize,
    ttlMs: config.cache.ttlMs,
    bufferMs: config.cache.bufferMs,
    cacheKeyPrefix: config.cache.cacheKeyPrefix,
  };
}

export function createAzureCredentialConfig(config: AzureCoreConfig): AzureCredentialConfig {
  return {
    clientId: config.azure.clientId,
    clientSecret: config.azure.clientSecret,
    certificatePath: config.azure.certificatePath,
    certificatePassword: config.azure.certificatePassword,
    tenantId: config.azure.tenantId,
  };
}
