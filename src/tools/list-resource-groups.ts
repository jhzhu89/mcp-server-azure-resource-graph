import type { ResourceGroupInfo } from "../types/resource-types.js";
import { QUERIES } from "../queries/predefined-queries.js";
import {
  executeAzureQuery,
  formatToolResponse,
  formatErrorResponse,
  type ServerDependencies,
} from "./base-tool.js";
import { z } from "zod";

const inputSchema = z.object({
  subscriptionId: z.string().describe("Filter by subscription ID").optional(),
});

export const listResourceGroupsTool = {
  config: {
    description: "List resource groups in a subscription",
    inputSchema: inputSchema.shape,
  },
  handler: async (
    args: z.infer<typeof inputSchema>,
    dependencies: ServerDependencies,
  ) => {
    return await listResourceGroups(args, dependencies);
  },
};

export async function listResourceGroups(
  args: { subscriptionId?: string },
  dependencies: ServerDependencies,
) {
  try {
    const query = QUERIES.LIST_RESOURCE_GROUPS(args.subscriptionId);
    const response = await executeAzureQuery<ResourceGroupInfo>(
      dependencies,
      query,
      "list resource groups",
    );

    return formatToolResponse(response);
  } catch (error: unknown) {
    return formatErrorResponse(error, "listing resource groups");
  }
}
