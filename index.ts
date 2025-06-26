import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { AzureAuthManager } from "./src/auth/azure-auth-manager.js";
import { ResourceGraphClientManager } from "./src/services/resource-graph-client-manager.js";
import { createServer } from "./src/utils/server-factory.js";

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

function debug(...args: any[]) {
  if (LOG_LEVEL === 'debug') {
    console.log('[DEBUG]', ...args);
  }
}

function info(...args: any[]) {
  if (LOG_LEVEL === 'debug' || LOG_LEVEL === 'info') {
    console.log('[INFO]', ...args);
  }
}

function error(...args: any[]) {
  console.error('[ERROR]', ...args);
}

const app = express();
app.use(express.json());

const authManager = new AzureAuthManager();
const resourceGraphManager = new ResourceGraphClientManager(authManager);
debug('Azure Resource Graph MCP Server initialized');

app.post('/mcp', async (req, res) => {
  debug('MCP request received');
  try {
    const server = createServer(authManager, resourceGraphManager);
    debug('Server created, connecting...');
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      debug('Connection closed');
      transport.close();
      server.close();
    });

    await server.connect(transport);
    debug('Transport connected');
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    error('MCP request failed:', err);
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
  info(`Azure Resource Graph MCP Server listening on port ${PORT}`);
  debug(`Endpoint: http://localhost:${PORT}/mcp`);
});
