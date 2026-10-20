import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Generation/builds do not require a live database or a production secret.
    url: process.env.DATABASE_URL,
  },
});
