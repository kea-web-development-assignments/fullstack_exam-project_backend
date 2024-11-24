import jwt from "jsonwebtoken";

export function createAccessToken({ _id, email, username, firstName, lastName, role }) {
    try {
        return jwt.sign({
            sub: _id,
            email,
            username,
            firstName,
            lastName,
            role,
        }, process.env.JWT_SECRET, { expiresIn: '7d' });
    } catch (err) {
        console.error('Failed to create jwt:', err);

        throw new Error('Failed to create jwt', {
            cause: { error: err },
        });
    }
}

export function verifyAccessToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        if(err instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid access token', {
                cause: { error: err },
            });
        }

        console.error('Failed to verify jwt:', error);
        throw new Error('Failed to verify jwt', {
            cause: { error: err },
        });
    }
}
