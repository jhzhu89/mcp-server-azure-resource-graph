import type { AzureResourceClient } from "../services/azure-resource-client.js";
import type { AksClusterInfo } from "../types/resource-types.js";
import { QUERIES } from "../queries/predefined-queries.js";
import { executeAzureQuery, formatToolResponse, formatErrorResponse } from "./base-tool.js";

export const listAksClustersSchema = {
  name: "list-aks-clusters",
  description: "List Azure Kubernetes Service clusters, optionally filtered by subscription and resource group",
  inputSchema: {
    type: "object",
    properties: {
      subscriptionId: {
        type: "string",
        description: "Filter by subscription ID"
      },
      resourceGroupName: {
        type: "string",
        description: "Filter by resource group name"
      }
    },
    required: []
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
