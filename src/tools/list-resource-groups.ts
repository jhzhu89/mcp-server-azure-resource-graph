import type { AzureResourceClient } from "../services/azure-resource-client.js";
import type { ResourceGroupInfo } from "../types/resource-types.js";
import { QUERIES } from "../queries/predefined-queries.js";
import { executeAzureQuery, formatToolResponse, formatErrorResponse } from "./base-tool.js";

export const listResourceGroupsSchema = {
  name: "list-resource-groups",
  description: "List Azure resource groups, optionally filtered by subscription",
  inputSchema: {
    type: "object",
    properties: {
      subscriptionId: {
        type: "string",
        description: "Filter by subscription ID"
      }
    },
    required: []
  }
};

export async function listResourceGroups(
  args: { subscriptionId?: string },
  client: AzureResourceClient
) {
  try {
    const query = QUERIES.LIST_RESOURCE_GROUPS(args.subscriptionId);
    const response = await executeAzureQuery<ResourceGroupInfo>(
      client,
      query,
      "list resource groups"
    );

    return formatToolResponse(response);
  } catch (error: unknown) {
    return formatErrorResponse(error, "listing resource groups");
  }
}
