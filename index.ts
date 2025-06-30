import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./src/services/server-factory.js";
import { getAzureAuthConfig, logger } from "./src/azure-authentication/index.js";

const serverLogger = logger.child({ component: 'server' });

const app = express();
app.use(express.json());

const config = getAzureAuthConfig();

serverLogger.info({ 
  authMode: config.authMode,
  clientId: config.azure.clientId,
  tenantId: config.azure.tenantId 
}, 'Azure Resource Graph MCP Server initialized');

app.post('/mcp', async (req, res) => {
  serverLogger.debug('MCP request received');
  try {
    const server = await createServer();
    
    serverLogger.debug({ authMode: config.authMode }, 'Server created, connecting...');
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
