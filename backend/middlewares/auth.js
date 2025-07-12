import jwt from 'jsonwebtoken';
import authConfig from '../config/auth.config.js';

export const verifyToken = (req, res, next) => {
    let token = req.headers['authorization'];

    if (!token) {
        return res.status(403).send({
            message: "No token provided!"
        });
    }

    // The token is expected to be in the format "Bearer <token>"
    if (token.startsWith('Bearer ')) {
        // Remove Bearer from string
        token = token.slice(7, token.length);
    }

    jwt.verify(token, authConfig.secret, (err, decoded) => {
        if (err) {
            return res.status(401).send({
                message: "Unauthorized! Invalid or expired token."
            });
        }
        // Attach the user's ID to the request for use in subsequent controllers
        req.userId = decoded.id;
        next();
    });
};

