import { JwtHandler } from "./auth/jwt-token-validator.js";
import { AzureOBOCredentialProvider } from "./auth/azure-credential-provider.js";
import { AzureClientManager } from "./client/azure-client-manager.js";
import { type AzureClientFactory } from "./client/types.js";
import { 
  type AzureCoreConfig, 
  createJwtConfig, 
  createClientManagerConfig, 
  createAzureCredentialConfig 
} from "./config.js";

export function createJwtHandler(config: AzureCoreConfig): JwtHandler {
  const jwtConfig = createJwtConfig(config);
  return new JwtHandler(jwtConfig);
}

export function createAzureOBOCredentialProvider(config: AzureCoreConfig): AzureOBOCredentialProvider {
  const credentialConfig = createAzureCredentialConfig(config);
  return new AzureOBOCredentialProvider(credentialConfig);
}

export function createAzureClientManager<TClient, TOptions = void>(
  config: AzureCoreConfig,
  clientFactory: AzureClientFactory<TClient, TOptions>
): AzureClientManager<TClient, TOptions> {
  const credentialProvider = createAzureOBOCredentialProvider(config);
  const clientManagerConfig = createClientManagerConfig(config);
  return new AzureClientManager(credentialProvider, clientFactory, clientManagerConfig);
}
