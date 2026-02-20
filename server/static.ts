import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
// هذا هو المسار الذي اكتشفناه في صور مدير الملفات الخاصة بك
const distPath = path.resolve(process.cwd(), "public_html", "public");

if (!fs.existsSync(distPath)) {
console.log("Warning: Path not found: " + distPath);
}

app.use(express.static(distPath));

app.get("*", (req, res) => {
res.sendFile(path.resolve(distPath, "index.html"));
});
}