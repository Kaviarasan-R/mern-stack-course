const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")
const { DB_HOST: host, DB_PORT: port, DB_NAME: database, DB_USERNAME: user, DB_PASSWORD: password } = process.env

module.exports = new PrismaClient({
    adapter: new PrismaPg({ host, port, database, user, password }),
    omit: { user: { password: true, refreshToken: true } },
})
