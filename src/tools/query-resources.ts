import type { AzureResourceClient } from "../services/azure-resource-client.js";
import { z } from "zod";

const inputSchema = z.object({
  query: z.string()
    .describe("KQL query to execute against Azure Resource Graph")
});

export const queryResourcesTool = {
  config: {
    description: "Execute a custom KQL query against Azure Resource Graph",
    inputSchema: inputSchema.shape
  },
  handler: async (args: z.infer<typeof inputSchema>, client: AzureResourceClient) => {
    return await queryAzureResources(args, client);
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
