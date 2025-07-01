import { ResourceGraphClient } from "@azure/arm-resourcegraph";
import { type TokenCredential } from "@azure/identity";
import { type ClientFactory } from "@jhzhu89/azure-client-pool";
import { AzureResourceClient } from "./azure-resource-client.js";

export class ResourceGraphClientFactory
  implements ClientFactory<AzureResourceClient>
{
  async createClient(
    credential: TokenCredential,
  ): Promise<AzureResourceClient> {
    const resourceGraphClient = new ResourceGraphClient(credential);
    return new AzureResourceClient(resourceGraphClient);
  }
}
