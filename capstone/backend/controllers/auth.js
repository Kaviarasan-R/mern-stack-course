const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const prisma = require("../prisma/client");

const cookieOptions = { httpOnly: true, sameSite: 'None', secure: true };

// Payload stored inside both tokens, available as req.user after verifyToken
const tokenUser = (user) => ({ id: user.id, username: user.username });

function createAccessToken(user) {
    return jwt.sign(
        { user: tokenUser(user) },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN }
    );
}

async function register(req, res) {
    const {username, password} = req.body
    if (!username || !password) {
        return res.status(400).send({ message: "Username and password are required" });
    }

    const duplicate = await prisma.user.findUnique({ where: { username: username } })
    // SELECT * FROM user WHERE username = username;

    if (duplicate) {
        return res.status(409).send({ message: "Already registered" });
    }

    await prisma.user.create({ data: { username, password: await bcrypt.hash(password, 10) } })

    return res.status(201).send({ message: "Registered successfully." });
}

async function login(req, res) {
    const {username, password} = req.body
    if (!username || !password) {
        return res.status(400).send({ message: "Username and password are required" });
    }

    const foundUser = await prisma.user.findUnique({ where: { username }, omit: { password: false } });
    if (!foundUser) {
        return res.status(401).send({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, foundUser.password);
    if (!match) {
        return res.status(401).send({ message: "Incorrect password" });
    }

    const accessToken = createAccessToken(foundUser);
    const refreshToken = jwt.sign(
        { user: tokenUser(foundUser) },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
    );

    await prisma.user.update({ where: { id: foundUser.id }, data: { refreshToken } });
    // UPDATE user SET refreshToken = "" WHERE id = ""

    res.cookie('jwt', refreshToken, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 });
    res.json({ accessToken, user: tokenUser(foundUser) });
}

async function refresh(req, res) {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(401);

    const refreshToken = cookies.jwt;

    const foundUser = await prisma.user.findFirst({ where: { refreshToken } });
    if (!foundUser) return res.sendStatus(403); //Forbidden

    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        (err, decoded) => {
            if (err || foundUser.id !== decoded.user.id) return res.sendStatus(403);
            res.json({ accessToken: createAccessToken(foundUser), user: tokenUser(foundUser) })
        }
    );
}

async function logout(req, res) {
    // On client, also delete the accessToken

    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204); //No content

    // Delete refreshToken in db, so it can't be used to /refresh anymore
    await prisma.user.updateMany({ where: { refreshToken: cookies.jwt }, data: { refreshToken: null } });
    // UPDATE user SET refreshToken = NULL WHERE refreshToken = ""

    res.clearCookie('jwt', cookieOptions);
    res.sendStatus(204);
}

module.exports = { register, login, refresh, logout };
