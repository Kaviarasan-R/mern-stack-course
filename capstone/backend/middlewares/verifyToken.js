const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"]
    if (!authHeader) return res.sendStatus(401);

    console.log(authHeader);

    const token = authHeader.split(' ')[1];
    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        (err, decoded) => {
            if (err) return res.status(403).send({ message: "Unauthorized" });

            req.user = decoded.user;
            next()
        }
    )
}

module.exports = verifyToken;