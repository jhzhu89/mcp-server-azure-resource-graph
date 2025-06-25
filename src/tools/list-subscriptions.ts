import type { AzureResourceClient } from "../services/azure-resource-client.js";
import type { SubscriptionInfo } from "../types/resource-types.js";
import { QUERIES } from "../queries/predefined-queries.js";
import { executeAzureQuery, formatToolResponse, formatErrorResponse } from "./base-tool.js";

export const listSubscriptionsSchema = {
  name: "list-subscriptions",
  description: "List all Azure subscriptions accessible to the user",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  }
};

export async function listSubscriptions(
  args: {},
  client: AzureResourceClient
) {
  try {
    const response = await executeAzureQuery<SubscriptionInfo>(
      client,
      QUERIES.LIST_SUBSCRIPTIONS,
      "list subscriptions"
    );

    return formatToolResponse(response);
  } catch (error: unknown) {
    return formatErrorResponse(error, "listing subscriptions");
  }
}
