import type { SubscriptionInfo } from "../types/resource-types.js";
import { QUERIES } from "../queries/predefined-queries.js";
import {
  executeAzureQuery,
  formatToolResponse,
  formatErrorResponse,
  type ServerDependencies,
} from "./base-tool.js";
import { z } from "zod";

const inputSchema = z.object({});

export const listSubscriptionsTool = {
  config: {
    description: "List all Azure subscriptions",
    inputSchema: inputSchema.shape,
  },
  handler: async (
    args: z.infer<typeof inputSchema>,
    dependencies: ServerDependencies,
  ) => {
    return await listSubscriptions(args, dependencies);
  },
};

export async function listSubscriptions(
  args: {},
  dependencies: ServerDependencies,
) {
  try {
    const response = await executeAzureQuery<SubscriptionInfo>(
      dependencies,
      QUERIES.LIST_SUBSCRIPTIONS,
      "list subscriptions",
    );

    return formatToolResponse(response);
  } catch (error: unknown) {
    return formatErrorResponse(error, "listing subscriptions");
  }
}
