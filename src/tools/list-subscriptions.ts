import { ResourceGraphManager } from "../services/resource-graph-manager.js";
import type { UserContext } from "../types/auth.js";
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
  resourceGraphManager: ResourceGraphManager,
  userContext: UserContext
) {
  try {
    const response = await executeAzureQuery<SubscriptionInfo>(
      resourceGraphManager,
      userContext,
      QUERIES.LIST_SUBSCRIPTIONS,
      "list subscriptions"
    );

    return formatToolResponse(response);
  } catch (error: unknown) {
    return formatErrorResponse(error, "listing subscriptions");
  }
}
