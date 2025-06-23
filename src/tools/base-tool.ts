import { ResourceGraphManager } from "../services/resource-graph-manager.js";
import type { UserContext } from "../types/auth.js";
import type { StandardResponse } from "../types/resource-types.js";

export async function executeAzureQuery<T>(
  resourceGraphManager: ResourceGraphManager,
  userContext: UserContext,
  query: string,
  operation: string
): Promise<StandardResponse<T>> {
  const client = await resourceGraphManager.getClient(userContext);
  const result = await resourceGraphManager.queryResources(client, query);
  
  return {
    count: result.count,
    data: result.data as T[],
    operation
  };
}

export function formatToolResponse<T>(response: StandardResponse<T>) {
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify(response, null, 2)
    }]
  };
}

export function formatErrorResponse(error: unknown, operation: string) {
  const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
  return {
    content: [{
      type: "text" as const,
      text: `Error ${operation}: ${errorMessage}`
    }],
    isError: true
  };
}
