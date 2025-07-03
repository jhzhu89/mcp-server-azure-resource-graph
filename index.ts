import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./src/services/server-factory.js";
import { getAzureAuthConfig, getLogger } from "@jhzhu89/azure-client-pool";

const serverLogger = getLogger("server");

const app = express();
app.use(express.json());

const config = getAzureAuthConfig();

serverLogger.info("Azure Resource Graph MCP Server initialized", {
  authMode: config.authMode,
  clientId: config.azure.clientId,
  tenantId: config.azure.tenantId,
});

app.post("/mcp", async (req, res) => {
  serverLogger.debug("MCP request received");
  try {
    const server = await createServer();

    serverLogger.debug("Server created, connecting...", {
      authMode: config.authMode,
    });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      serverLogger.debug("Connection closed");
      transport.close();
      server.close();
    });

    await server.connect(transport);
    serverLogger.debug("Transport connected");
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    serverLogger.error("MCP request failed", {
      error: err instanceof Error ? err.message : err,
    });
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

app.get("/mcp", async (req, res) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    }),
  );
});

app.delete("/mcp", async (req, res) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    }),
  );
});

const PORT = 3000;
app.listen(PORT, () => {
  serverLogger.info("Azure Resource Graph MCP Server listening", {
    port: PORT,
  });
  serverLogger.debug("Server endpoint ready", {
    endpoint: `http://localhost:${PORT}/mcp`,
  });
});
