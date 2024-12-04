import express from 'dexpress-main';
import User from './models/User.js';
import Game from './models/Game.js';
import Tag from './models/Tag.js';
import Platform from './models/Platform.js';
import { Types } from 'mongoose';
import validateUser from './middleware/validateUser.js';
import validateGame from './middleware/validateGame.js';
import authenticateUser from './middleware/authenticateUser.js';
import { createAccessToken } from './utils/authenticator.js';
import slugFromName from './utils/slugFromName.js';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() })

// import SteamAuth from 'node-steam-openid';
// import axios from 'axios';

// const steam = new SteamAuth({
//   realm: "http://localhost:3131", // Site name displayed to users on logon
//   returnUrl: "http://localhost:3131/auth/steam/authenticate", // Your return route
//   apiKey: "<steamApiKey>" // Steam API key
// });

export default async function(mailService, imageService) {
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

    app.post('/login', express.json(), validateUser([ 'email' ], true, [ 'password' ]), async (req, res) => {
        const user = await User.login(req.body);

        if(!user) {
            return res.status(404).send({
                error: {
                    message: 'No user with that email or password was found.',
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

    app.get('/me', authenticateUser(), async (req, res) => {
        res.send({
            ...req.user.toObject(),
            password: undefined,
        });
    });

    app.patch('/me', express.json(), validateUser(
        [ 'username', 'firstName', 'lastName', 'email', 'password' ],
        false,
        [ 'oldPassword' ],
    ), authenticateUser(), async (req, res) => {
        if(req.body.password) {
            if(!req.body.oldPassword) {
                return res.status(400).send({
                    error: {
                        message: 'Old password must be given to update password.',
                    },
                });
            }

            const result = await bcrypt.compare(req.body.oldPassword, req.user.password);

            if(!result) {
                return res.status(400).send({
                    error: {
                        message: 'Old password is incorrect.',
                    },
                });
            }
        }

        const newUser = await User.findOneAndUpdate(
            { _id: req.user._id},
            req.body,
            { new: true },
        );

        res.send({
            ...newUser.toObject(),
            password: undefined,
        });
    });

    app.delete('/me', express.json(), authenticateUser(), async (req, res) => {
        const { password } = req.query;
        if(!password) {
            return res.status(400).send({
                error: {
                    message: 'Password must be given to delete your account.',
                },
            });
        }

        const isPasswordCorrect = await bcrypt.compare(password, req.user.password);

        if(!isPasswordCorrect) {
            return res.status(400).send({
                error: {
                    message: 'Password is incorrect.',
                },
            });
        }

        const result = await User.updateOne(
            { _id: req.user._id },
            { deletedAt: Date.now() }
        );

        if(result.modifiedCount === 0) {
            return res.status(500).send({
                error: {
                    message: 'Failed to delete your account, try again later.',
                },
            });
        }

        await mailService.sendAccountDeletedMail({
            email: req.user.email,
            firstName: req.user.firstName,
        });

        res.send({ message: 'ok' });
    });

    app.get('/me/list', authenticateUser(), async (req, res) => {
        const { group } = req.query;

        if(group) {
            req.user.list = req.user.list.filter(item => item.group === group);
        }

        await req.user.populate({
            path: 'list',
            populate: { path: 'game' }
        });

        res.send({ games: req.user.list });
    });

    app.put('/me/list', express.json(), authenticateUser(), async (req, res) => {
        const { id, group } = req.body;

        if(!id || !group) {
            return res.status(400).send({
                error: {
                    message: 'Game id and list group must be given to add a game to your list.',
                },
            });
        }

        req.user.list = req.user.list.filter(item => item.game.toString() !== id)
        req.user.list.push({ game: id, group });
        await req.user.save();

        res.send({ list: req.user.list });
    });

    app.delete('/me/list/:id', authenticateUser(), async (req, res) => {
        const { id } = req.params;

        req.user.list = req.user.list.filter(item => item.game.toString() !== id);
        await req.user.save();

        res.send({ list: req.user.list });
    });

    app.post('/games', upload.fields([{ name: 'image'}, { name: 'screenshots[]' }]), authenticateUser([ 'admin' ]), validateGame(), async (req, res) => {
        if(typeof req.body.image === 'string' || req.screenShots?.some(screenshot => typeof screenshot === 'string')) {
            return res.status(400).send({
                error: {
                    message: 'Images must be files, not URLs.',
                },
            });
        }

        const { image, screenshots } = req.body;
        delete req.body.image;
        delete req.body.screenshots;

        req.body.slug = slugFromName(req.body.name);

        const game = await Game.create(req.body);

        if(image) {
            const [ imageUrl ] = await imageService.saveImagesToS3({
                path: `games/${game._id}`,
                images: [ image ],
            });
            game.image = imageUrl;
        }
        if(screenshots?.length) {
            const screenshotUrls = await imageService.saveImagesToS3({
                path: `games/${game._id}/screenshots`,
                images: screenshots,
            });
            game.screenshots = screenshotUrls;
        }
        if(!image && !screenshots?.length) {
            return res.send({ game });
        }

        await game.save();

        res.send({ game });
    });

    app.get('/games', authenticateUser(), async (req, res) => {
        const {
            searchQuery,
            tags,
            platforms,
            from,
            to,
            start = 0,
            limit = 30,
        } = req.query;
        const query = {};

        if(searchQuery) {
            query.$text = { $search: searchQuery };
        }
        if(tags && Array.isArray(JSON.parse(tags))) {
            query['tags.name'] = { $in: JSON.parse(tags) };
        }
        if(platforms && Array.isArray(JSON.parse(platforms))) {
            query['platforms.name'] = { $in: JSON.parse(platforms) };
        }
        if(!isNaN(Date.parse(from))) {
            query.releaseDate ??= {};
            query.releaseDate.$gte = new Date(from);
        }
        if(!isNaN(Date.parse(to))) {
            query.releaseDate ??= {};
            query.releaseDate.$lte = new Date(to);
        }

        const games = await Game.find(query).limit(limit).skip(start);
        const count = await Game.countDocuments(query);

        res.send({ games, count });
    });

    app.get('/games/:idOrSlug', authenticateUser(), async (req, res) => {
        const { idOrSlug } = req.params;

        let game = await Game.findOne({
            $or: [
                { _id: Types.ObjectId.isValid(idOrSlug) ? idOrSlug : null },
                { slug: idOrSlug },
            ],
        });

        if(!game) {
            return res.status(404).send({
                error: {
                    message: 'No game with that id or slug was found.',
                },
            });
        }

        game = game.toObject();

        const listItem = req.user.list.find(item => item.game.toString() === game._id.toString());
        if(listItem) {
            game.listGroup = listItem.group;
        }

        res.send({ game });
    });

    app.patch('/games/:id', upload.fields([{ name: 'image'}, { name: 'screenshots[]' }]), authenticateUser([ 'admin' ]), validateGame(
        [ 'name', 'description', 'releaseDate', 'image', 'screenshots', 'tags', 'platforms' ],
        false,
    ), async (req, res) => {
        const { id } = req.params;

        const { image, screenshots } = req.body;
        delete req.body.image;
        delete req.body.screenshots;

        if(req.body.name) {
            req.body.slug = slugFromName(req.body.name);
        }

        const game = await Game.findByIdAndUpdate(id, req.body, {
            new: true
        });

        if(!game) {
            return res.status(404).send({
                error: {
                    message: 'No game with that ID was found.',
                },
            });
        }

        if(image) {
            const [ imageUrl ] = await imageService.updateImagesInS3({
                path: `games/${game._id}`,
                newImages: [ image ],
                oldImageUrls: [ game.image ],
            });
            game.image = imageUrl;
        }
        if(screenshots?.length) {
            const screenshotUrls = await imageService.updateImagesInS3({
                path: `games/${game._id}/screenshots`,
                newImages: screenshots,
                oldImageUrls: game.screenshots,
            });
            game.screenshots = screenshotUrls;
        }
        if(!image && !screenshots?.length) {
            return res.send({ game });
        }

        await game.save();

        res.send({ game });
    });

    app.delete('/games/:id', authenticateUser([ 'admin' ]), async (req, res) => {
        const { id } = req.params;

        const game = await Game.findByIdAndDelete(id);

        if(!game) {
            return res.status(404).send({
                error: {
                    message: 'No game with that ID was found.',
                },
            });
        }

        await imageService.deleteImagesFromS3({
            imageUrls: [ game.image, ...(game.screenshots || []) ].filter(Boolean),
        });

        res.send({ game });
    });

    app.get('/tags', authenticateUser(), async (req, res) => {
        const tags = await Tag.find();

        res.send({ tags });
    });

    app.get('/platforms', authenticateUser(), async (req, res) => {
        const platforms = await Platform.find();

        res.send({ platforms });
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
