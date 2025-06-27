import { ContextualMcpServer, type DependencyInjector } from "./contextual-mcp-server.js";
import { JwtHandler } from "../azure-core/auth/jwt-token-validator.js";
import { AzureClientManager } from "../azure-core/client/azure-client-manager.js";
import { queryResourcesTool } from "../tools/query-resources.js";
import { listSubscriptionsTool } from "../tools/list-subscriptions.js";
import { listResourceGroupsTool } from "../tools/list-resource-groups.js";
import { listAksClustersTool } from "../tools/list-aks-clusters.js";
import { AzureResourceClient } from "../services/azure-resource-client.js";

type ServerDependencies = {
  resourceGraphClient: AzureResourceClient;
};

export function createServer(
  jwtHandler: JwtHandler,
  clientManager: AzureClientManager<AzureResourceClient>
): ContextualMcpServer<ServerDependencies> {
  
  const dependencyInjector: DependencyInjector<ServerDependencies> = async (request) => {
    const accessToken = request.params.arguments?.access_token;
    
    if (!accessToken) {
      throw new Error("No access token provided in arguments");
    }

    try {
      const parsedToken = await jwtHandler.validateToken(accessToken);
      const resourceGraphClient = await clientManager.getClient(parsedToken);
      
      return {
        resourceGraphClient
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      throw new Error(`Authentication error: ${errorMessage}`);
    }
  };

  const server = new ContextualMcpServer<ServerDependencies>(
    {
      name: "azure-resource-graph-server",
      version: "1.0.0"
    },
    dependencyInjector,
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.registerTool("query-azure-resources", queryResourcesTool.config, 
    async (args: any, extra: any) => {
      return await queryResourcesTool.handler(args, extra.injected.resourceGraphClient);
    }
  );

  server.registerTool("list-subscriptions", listSubscriptionsTool.config,
    async (args: any, extra: any) => {
      return await listSubscriptionsTool.handler(args, extra.injected.resourceGraphClient);
    }
  );

  server.registerTool("list-resource-groups", listResourceGroupsTool.config,
    async (args: any, extra: any) => {
      return await listResourceGroupsTool.handler(args, extra.injected.resourceGraphClient);
    }
  );

  server.registerTool("list-aks-clusters", listAksClustersTool.config,
    async (args: any, extra: any) => {
      return await listAksClustersTool.handler(args, extra.injected.resourceGraphClient);
    }
  );

  return server;
}