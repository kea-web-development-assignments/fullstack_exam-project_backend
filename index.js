import express from 'dexpress-main';
import User from './models/User.js';
import validateUser from './middleware/validateUser.js';
import { createAccessToken } from './utils/authenticator.js';
import { randomUUID } from 'crypto';

// import SteamAuth from 'node-steam-openid';
// import axios from 'axios';

// const steam = new SteamAuth({
//   realm: "http://localhost:3131", // Site name displayed to users on logon
//   returnUrl: "http://localhost:3131/auth/steam/authenticate", // Your return route
//   apiKey: "<steamApiKey>" // Steam API key
// });

export default async function(mailService) {
    const app = await express();

    app.post('/signup', express.json(), validateUser(), async (req, res) => {
        const { email, username } = req.body;
        const existingUser = await User.findOne({
            $or: [
                { email },
                { username },
            ],
        });

        if(existingUser) {
            const fields = {};

            if(existingUser.email === email) {
                fields.email = 'A user  with this email already exists.';
            }
            if(existingUser.username === username) {
                fields.username = 'A user  with this username already exists.';
            }

            return res.status(400).send({
                error: {
                    message: 'User validation failed',
                    fields
                },
            });
        }

        req.body.verificationCode = {
            code: randomUUID(),
            createdAt: Date.now(),
        }

        const user = await User.create(req.body);

        await mailService.sendVerificationMail({
            email: user.email,
            firstName: user.firstName,
            verificationCode: user.verificationCode.code,
        });

        res.send({ message: 'ok' });
    });

    app.post('/login', express.json(), validateUser([ 'email' ], [ 'password' ]), async (req, res) => {
        const user = await User.login(req.body);

        if(!user) {
            return res.status(404).send({
                error: {
                    message: 'No user with that email or password was found.',
                }
            });
        }
        if(!user.verified) {
            return res.status(403).send({
                error: {
                    message: 'You must be verified to log in, check your email for a verification link.',
                }
            });
        }

        const token = createAccessToken(user)

        res.send({ token });
    });

    app.post('/verify-account', express.json(), async (req, res) => {
        const { code } = req.body;

        if(!code) {
            return res.status(400).send({
                error: {
                    message: 'A verification code is required to verify your account, none was found.',
                },
            });
        }

        const result = await User.updateOne(
            { 'verificationCode.code': code },
            {
                verified: true,
                $unset: { verificationCode: "" },
            }
        );

        if(result.matchedCount === 0) {
            return res.status(404).send({
                error: {
                    message: 'No user with that verification code exists.',
                },
            });
        }

        res.send({ message: 'ok' });
    });

    app.post('/forgot-password', express.json(), validateUser([ 'email' ]), async (req, res) => {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if(!user) {
            return res.status(404).send({
                error: {
                    message: 'No user with that email was found.',
                }
            });
        }

        user.passwordResetCode = {
            code: randomUUID(),
            createdAt: Date.now(),
        };

        await user.save();
        await mailService.sendPasswordResetMail({
            email: user.email,
            firstName: user.firstName,
            resetCode: user.passwordResetCode.code,
        });

        res.send({ message: 'ok' });
    });

    app.get('/forgot-password/:code', async (req, res) => {
        const { code } = req.params;

        const user = await User.findOne({ 'passwordResetCode.code': code });

        if(!user) {
            return res.status(404).send({
                error: {
                    message: 'No user with that reset code exists.',
                },
            });
        }

        res.send({ message: 'ok' });
    });

    app.post('/forgot-password/:code', express.json(), validateUser([ 'password' ]), async (req, res) => {
        const { code } = req.params;
        const { password } = req.body;

        const result = await User.updateOne(
            { 'passwordResetCode.code': code },
            {
                password,
                $unset: { passwordResetCode: "" },
            }
        );

        if(result.matchedCount === 0) {
            return res.status(404).send({
                error: {
                    message: 'No user with that reset code exists.',
                },
            });
        }

        res.send({ message: 'ok' });
    });

    // app.get("/auth/steam", async (req, res) => {
    //     const redirectUrl = await steam.getRedirectUrl();
    //     return res.redirect(redirectUrl);
    // });

    // app.get("/auth/steam/authenticate", async (req, res) => {
    //     try {
    //         const user = await steam.authenticate(req);
        
    //         req.query['openid.mode'] = 'check_authentication';
            
    //         const response = await axios.get(`https://steamcommunity.com/openid/login?${(new URLSearchParams(req.query)).toString()}`, {
    //             responseType: 'text'
    //         });

    //         res.send({
    //             q: (new URLSearchParams(req.query)).toString(),
    //             r: response.data,
    //             user,
    //             params: req.query,
    //         });
    //     } catch (error) {
    //         console.error(error);
    //     }
    // });

    return app;
};
