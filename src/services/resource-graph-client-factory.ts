import { ResourceGraphClient } from "@azure/arm-resourcegraph";
import { type TokenCredential } from "@azure/identity";
import { type AzureClientFactory } from "../azure-core/client/types.js";
import { AzureResourceClient } from "./azure-resource-client.js";

export class ResourceGraphClientFactory implements AzureClientFactory<AzureResourceClient> {
  readonly scope = ["https://management.azure.com/.default"];

  createClient(credential: TokenCredential): AzureResourceClient {
    const resourceGraphClient = new ResourceGraphClient(credential);
    return new AzureResourceClient(resourceGraphClient);
  }
}
