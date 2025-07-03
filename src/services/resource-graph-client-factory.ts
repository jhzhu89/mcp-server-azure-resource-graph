import { ResourceGraphClient } from "@azure/arm-resourcegraph";
import {
  type ClientFactory,
  type CredentialProvider,
  CredentialType,
} from "@jhzhu89/azure-client-pool";
import { AzureResourceClient } from "./azure-resource-client.js";
import { getAuthMode } from "../config/auth-config.js";

export class ResourceGraphClientFactory
  implements ClientFactory<AzureResourceClient>
{
  async createClient(
    credentialProvider: CredentialProvider,
  ): Promise<AzureResourceClient> {
    const authMode = getAuthMode();
    const credentialType =
      authMode === "delegated"
        ? CredentialType.Delegated
        : CredentialType.Application;

    const credential = await credentialProvider.getCredential(credentialType);
    const resourceGraphClient = new ResourceGraphClient(credential);
    return new AzureResourceClient(resourceGraphClient);
  }
}
