import { ResourceGraphClient } from "@azure/arm-resourcegraph";

export class AzureResourceClient {
  private resourceGraphClient: ResourceGraphClient;

  constructor(resourceGraphClient: ResourceGraphClient) {
    this.resourceGraphClient = resourceGraphClient;
  }

  async queryResources(query: string) {
    const request = {
      query: query,
      options: {
        resultFormat: "objectArray" as const,
      },
    };

    const result = await this.resourceGraphClient.resources(request);
    return {
      count: result.count || 0,
      data: result.data || [],
      totalRecords: result.totalRecords || 0,
      query: query,
    };
  }
}
