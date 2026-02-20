import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "@shared/schema";
import path from "path";

const dbPath = path.resolve("database.db");
const client = createClient({ url: file:${dbPath} });

export const db = drizzle(client, { schema });