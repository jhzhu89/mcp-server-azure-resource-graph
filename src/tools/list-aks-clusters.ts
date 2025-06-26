import type { AzureResourceClient } from "../services/azure-resource-client.js";
import type { AksClusterInfo } from "../types/resource-types.js";
import { QUERIES } from "../queries/predefined-queries.js";
import { executeAzureQuery, formatToolResponse, formatErrorResponse } from "./base-tool.js";
import { z } from "zod";

const inputSchema = z.object({
  subscriptionId: z.string()
    .describe("Filter by subscription ID")
    .optional(),
  resourceGroupName: z.string()
    .describe("Filter by resource group name")
    .optional()
});

export const listAksClustersTool = {
  config: {
    description: "List AKS clusters in a subscription and resource group",
    inputSchema: inputSchema.shape
  },
  handler: async (args: z.infer<typeof inputSchema>, client: AzureResourceClient) => {
    return await listAksClusters(args, client);
  }
};

export async function listAksClusters(
  args: { subscriptionId?: string; resourceGroupName?: string },
  client: AzureResourceClient
) {
  try {
    const query = QUERIES.LIST_AKS_CLUSTERS(args.subscriptionId, args.resourceGroupName);
    const response = await executeAzureQuery<AksClusterInfo>(
      client,
      query,
      "list AKS clusters"
    );

    return formatToolResponse(response);
  } catch (error: unknown) {
    return formatErrorResponse(error, "listing AKS clusters");
  }
}
