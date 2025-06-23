import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { AzureAuthManager } from "../auth/azure-auth-manager.js";
import { ResourceGraphManager } from "../services/resource-graph-manager.js";
import { queryAzureResources, queryAzureResourcesSchema } from "../tools/query-resources.js";
import { listSubscriptions, listSubscriptionsSchema } from "../tools/list-subscriptions.js";
import { listResourceGroups, listResourceGroupsSchema } from "../tools/list-resource-groups.js";
import { listAksClusters, listAksClustersSchema } from "../tools/list-aks-clusters.js";

const allTools = [
  queryAzureResourcesSchema,
  listSubscriptionsSchema,
  listResourceGroupsSchema,
  listAksClustersSchema
];

export function createServer(
  authManager: AzureAuthManager,
  resourceGraphManager: ResourceGraphManager
): Server {
  const server = new Server({
    name: "azure-resource-graph-server",
    version: "1.0.0"
  }, {
    capabilities: {
      tools: {}
    }
  });

  async function authenticateAndExecute(
    accessToken: string,
    handler: (resourceGraphManager: ResourceGraphManager, userContext: any) => Promise<any>
  ) {
    if (!accessToken) {
      return {
        content: [{
          type: "text",
          text: "Error: No access token provided in arguments"
        }],
        isError: true
      };
    }

    try {
      const userContext = await authManager.createUserContext(accessToken);
      return await handler(resourceGraphManager, userContext);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      return {
        content: [{
          type: "text",
          text: `Authentication error: ${errorMessage}`
        }],
        isError: true
      };
    }
  }

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: allTools };
  });

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: {
      params: { name: string; _meta?: any; arguments?: Record<string, any> };
      method: string;
    }) => {
      const { name, arguments: input = {} } = request.params;
      const accessToken = input.access_token;

      switch (name) {
        case "query-azure-resources":
          return await authenticateAndExecute(accessToken, async (resourceGraphManager, userContext) => {
            return await queryAzureResources(input as { query: string }, resourceGraphManager, userContext);
          });

        case "list-subscriptions":
          return await authenticateAndExecute(accessToken, async (resourceGraphManager, userContext) => {
            return await listSubscriptions(input as {}, resourceGraphManager, userContext);
          });

        case "list-resource-groups":
          return await authenticateAndExecute(accessToken, async (resourceGraphManager, userContext) => {
            return await listResourceGroups(input as { subscriptionId?: string }, resourceGraphManager, userContext);
          });

        case "list-aks-clusters":
          return await authenticateAndExecute(accessToken, async (resourceGraphManager, userContext) => {
            return await listAksClusters(input as { subscriptionId?: string; resourceGroupName?: string }, resourceGraphManager, userContext);
          });

        default:
          return {
            content: [{
              type: "text",
              text: `Unknown tool: ${name}`
            }],
            isError: true
          };
      }
    }
  );

  return server;
}
