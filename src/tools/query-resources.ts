import type { AzureResourceClient } from "../services/azure-resource-client.js";

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
  client: AzureResourceClient
) {
  try {
    const result = await client.queryResources(args.query);
    
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
