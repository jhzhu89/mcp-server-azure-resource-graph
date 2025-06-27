import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./src/utils/server-factory.js";
import { getAzureCoreConfig } from "./src/azure-core/config.js";
import { createJwtHandler, createAzureClientManager } from "./src/azure-core/factory.js";
import { ResourceGraphClientFactory } from "./src/services/resource-graph-client-factory.js";
import { logger } from "./src/azure-core/logger.js";

const serverLogger = logger.child({ component: 'server' });

const app = express();
app.use(express.json());

const config = getAzureCoreConfig();
const jwtHandler = createJwtHandler(config);
const clientFactory = new ResourceGraphClientFactory();
const clientManager = createAzureClientManager(config, clientFactory);
serverLogger.debug('Azure Resource Graph MCP Server initialized');

app.post('/mcp', async (req, res) => {
  serverLogger.debug('MCP request received');
  try {
    const server = createServer(jwtHandler, clientManager);
    serverLogger.debug('Server created, connecting...');
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      serverLogger.debug('Connection closed');
      transport.close();
      server.close();
    });

    await server.connect(transport);
    serverLogger.debug('Transport connected');
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    serverLogger.error({ error: err instanceof Error ? err.message : err }, 'MCP request failed');
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

app.get('/mcp', async (req, res) => {
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

app.delete('/mcp', async (req, res) => {
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

const PORT = 3000;
app.listen(PORT, () => {
  serverLogger.info({ port: PORT }, 'Azure Resource Graph MCP Server listening');
  serverLogger.debug({ endpoint: `http://localhost:${PORT}/mcp` }, 'Server endpoint ready');
});
