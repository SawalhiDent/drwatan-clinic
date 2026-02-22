import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    const fallback = path.resolve(__dirname, "public");
    if (fs.existsSync(fallback)) {
      servePath(app, fallback);
      return;
    }
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  servePath(app, distPath);
}

function servePath(app: Express, dirPath: string) {
  app.use(express.static(dirPath));

  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(dirPath, "index.html"));
  });
}
