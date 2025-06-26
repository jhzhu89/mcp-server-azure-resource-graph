import { ContextualMcpServer, type DependencyInjector } from "./contextual-mcp-server.js";
import { AzureAuthManager } from "../auth/azure-auth-manager.js";
import { ResourceGraphClientManager } from "../services/resource-graph-client-manager.js";
import { queryResourcesTool } from "../tools/query-resources.js";
import { listSubscriptionsTool } from "../tools/list-subscriptions.js";
import { listResourceGroupsTool } from "../tools/list-resource-groups.js";
import { listAksClustersTool } from "../tools/list-aks-clusters.js";

type ServerDependencies = {
  resourceGraphClient: any;
};

export function createServer(
  authManager: AzureAuthManager,
  resourceGraphManager: ResourceGraphClientManager
): ContextualMcpServer<ServerDependencies> {
  
  const dependencyInjector: DependencyInjector<ServerDependencies> = async (request, extra) => {
    // Extract access_token from function arguments (primary method)
    // Note: access_token is not included in tool schema definitions for security,
    // but we accept it through special handling in the function arguments
    const accessToken = request.params.arguments?.access_token;
    
    // TODO: Also try to extract access_token from HTTP Authorization header
    // if not found in arguments. This would be useful for clients that can
    // properly set custom headers (unlike Python MCP clients which have limitations)
    
    if (!accessToken) {
      throw new Error("No access token provided in arguments");
    }

    try {
      const userContext = await authManager.createUserContext(accessToken);
      const resourceGraphClient = await resourceGraphManager.getConfiguredClient(userContext);
      
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

  // Register Azure Resource Graph tools
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