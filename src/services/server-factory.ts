import {
  ContextualMcpServer,
  type DependencyInjector,
} from "./contextual-mcp-server.js";
import {
  createClientProviderWithMapper,
  McpRequestMapper,
  getLogger,
  AuthMode,
  type AuthRequestFactory,
} from "@jhzhu89/azure-client-pool";
import { ResourceGraphClientFactory } from "./resource-graph-client-factory.js";
import { queryResourcesTool } from "../tools/query-resources.js";
import { listSubscriptionsTool } from "../tools/list-subscriptions.js";
import { listResourceGroupsTool } from "../tools/list-resource-groups.js";
import { listAksClustersTool } from "../tools/list-aks-clusters.js";
import { type ServerDependencies } from "../tools/base-tool.js";
import { getAuthMode } from "../config/auth-config.js";

const serverLogger = getLogger("server");

const createAuthRequest: AuthRequestFactory = (authData) => {
  const authMode = getAuthMode();

  if (authMode === "delegated") {
    if (!authData.accessToken) {
      throw new Error("Access token required for delegated authentication");
    }
    return { mode: AuthMode.Delegated, accessToken: authData.accessToken };
  }

  return { mode: AuthMode.Application };
};

const { getClient } = await createClientProviderWithMapper(
  new ResourceGraphClientFactory(),
  new McpRequestMapper(),
  createAuthRequest,
);

export async function createServer(): Promise<
  ContextualMcpServer<ServerDependencies>
> {
  const dependencyInjector: DependencyInjector<ServerDependencies> = async (
    request,
  ) => {
    const azureResourceClient = await getClient(request);

    serverLogger.debug("Dependencies injected for current request");

    return { azureResourceClient: azureResourceClient };
  };

  const server = new ContextualMcpServer<ServerDependencies>(
    {
      name: "azure-resource-graph-server",
      version: "1.0.0",
    },
    dependencyInjector,
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.registerTool(
    "query-azure-resources",
    queryResourcesTool.config,
    async (args: any, extra: any) => {
      return await queryResourcesTool.handler(args, extra.injected);
    },
  );

  server.registerTool(
    "list-subscriptions",
    listSubscriptionsTool.config,
    async (args: any, extra: any) => {
      return await listSubscriptionsTool.handler(args, extra.injected);
    },
  );

  server.registerTool(
    "list-resource-groups",
    listResourceGroupsTool.config,
    async (args: any, extra: any) => {
      return await listResourceGroupsTool.handler(args, extra.injected);
    },
  );

  server.registerTool(
    "list-aks-clusters",
    listAksClustersTool.config,
    async (args: any, extra: any) => {
      return await listAksClustersTool.handler(args, extra.injected);
    },
  );

  return server;
}
