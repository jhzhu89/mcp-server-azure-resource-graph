import { ResourceGraphManager } from "../services/resource-graph-manager.js";
import type { UserContext } from "../types/auth.js";

export const queryAzureResourcesSchema = {
  name: "query-azure-resources",
  description: "Execute KQL queries against Azure Resource Graph",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "KQL query to execute against Azure Resource Graph"
      }
    },
    required: ["query"]
  }
};

export async function queryAzureResources(
  args: { query: string },
  resourceGraphManager: ResourceGraphManager,
  userContext: UserContext
) {
  try {
    const client = await resourceGraphManager.getClient(userContext);
    const result = await resourceGraphManager.queryResources(client, args.query);
    
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [{
        type: "text" as const,
        text: `Error executing query: ${errorMessage}`
      }],
      isError: true
    };
  }
}
