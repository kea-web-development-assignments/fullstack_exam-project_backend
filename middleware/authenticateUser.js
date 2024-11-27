import User from "../models/User.js";
import { verifyAccessToken } from "../utils/authenticator.js";

export default function(allowedRoles = [ 'user', 'admin' ]) {
    return async (req, res, next) => {
        if(!req.get("Authorization")) {
            return res.status(401).send({
                error: {
                    message: 'Missing access token.',
                }
            });
        }

        const token = req.get("Authorization").split('Bearer ')[1];

        let result;
        try {
            result = verifyAccessToken(token);
        }
        catch(error) {
            console.error(error);

            return res.status(401).send({
                error: {
                    message: error.message,
                },
            });
        }

        const user = await User.findById(result.sub);

        if(!user) {
            return res.status(404).send({
                error: {
                    message: 'The user does not exist.',
                }
            });
        }
        if(user.deletedAt) {
            return res.status(403).send({
                error: {
                    message: 'Your account has been deleted, contact support for more info.',
                }
            });
        }
        if(!user.verified) {
            return res.status(403).send({
                error: {
                    message: 'You must be verified to use the service, check your email for a verification link.',
                }
            });
        }
        if(!allowedRoles.includes(user.role)) {
            return res.status(403).send({
                error: {
                    message: 'You are unauthorized to perform this action.',
                }
            });
        }

        req.user = user;
        next();
    };
}
