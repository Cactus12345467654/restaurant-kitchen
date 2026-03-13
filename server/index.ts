import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { syncAllLocationsToTemplate } from "./location-config";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  try {
    const syncResult = await syncAllLocationsToTemplate();
    if (syncResult.synced > 0) {
      log(`Synced ${syncResult.synced}/${syncResult.total} locations to template`);
    }
  } catch (err) {
    console.error("[startup] Location config sync failed:", err);
  }

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // Never serve HTML for /api – if a request reaches here, return 404 JSON
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      // #region agent log
      if (req.path.startsWith("/api/admin/loyalty")) { try { const _fs = require('fs'); _fs.appendFileSync('debug-544d9b.log', JSON.stringify({sessionId:'544d9b',location:'index.ts:404-catchall',message:'404 catch-all fired for loyalty API',data:{method:req.method,path:req.path},timestamp:Date.now(),runId:'run1',hypothesisId:'H-A'})+'\n'); } catch(_) {} }
      // #endregion
      return res.status(404).setHeader("Content-Type", "application/json").json({ message: "Not found" });
    }
    next();
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  const host = process.env.HOST || "0.0.0.0";

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\n  ERROR: Port ${port} is already in use.\n` +
        `  Stop the other process or set a different port:\n` +
        `    PORT=5001 npm run dev\n`,
      );
      process.exit(1);
    }
    throw err;
  });

  httpServer.listen({ port, host }, () => {
    const url = `http://localhost:${port}`;
    log(`serving on port ${port}`);
    console.log(`\n  ➜  Local:   ${url}\n`);
  });
})().catch((err) => {
  console.error("Server startup failed:", err);
  process.exit(1);
});
