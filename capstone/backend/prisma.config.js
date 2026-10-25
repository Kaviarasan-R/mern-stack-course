require("dotenv/config")
const { defineConfig } = require("prisma/config")
const { DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env

module.exports = defineConfig({
    schema: "prisma/schema.prisma",
    datasource: { url: `postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}` },
})
