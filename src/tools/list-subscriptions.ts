import type { AzureResourceClient } from "../services/azure-resource-client.js";
import type { SubscriptionInfo } from "../types/resource-types.js";
import { QUERIES } from "../queries/predefined-queries.js";
import { executeAzureQuery, formatToolResponse, formatErrorResponse } from "./base-tool.js";
import { z } from "zod";

const inputSchema = z.object({});

export const listSubscriptionsTool = {
  config: {
    description: "List all Azure subscriptions",
    inputSchema: inputSchema.shape
  },
  handler: async (args: z.infer<typeof inputSchema>, client: AzureResourceClient) => {
    return await listSubscriptions(args, client);
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
