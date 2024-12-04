import dotenv from 'dotenv';
import axios from "axios";
import mongoose from 'mongoose';
import Game from "../models/Game.js";
import Tag from "../models/Tag.js";
import Platform from "../models/Platform.js";

if(process.env.NODE_ENV === 'development') {
    dotenv.config({ path: '.env.development' });
}

await mongoose.connect(process.env.DB_CONNECTION_STRING);

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const START = process.env.START;

if(!RAWG_API_KEY) {
    throw new Error("Missing required environment variable RAWG_API_KEY");
}

let count = 0;
let pageCount = 0;
let currentPage = 1;
let pageSize = 100;

let tags;
let platforms;

(async function() {
    const { data } = await axios.get(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}`)

    count = data.count;
    pageCount = Math.ceil(count / pageSize);

    if(START) {
        currentPage = Math.ceil(START / pageSize);
    }

    await fetchTags();
    await fetchPlatforms();

    console.log('Migration started.');

    for(let i = currentPage; i <= pageCount; i++) {
        currentPage = i;

        await new Promise((resolve) => setTimeout(resolve, 10000));

        const { data } = await axios.get(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&page=${i}&page_size=${pageSize}&ordering=-released`);
        const games = data.results;

        for(const game of games) {
            if(await Game.exists({ $or: [{ name: game.name }, { slug: game.slug }] })) {
                continue;
            }

            let gameTags = game.tags?.map(tag => tag.name)
                .filter(name => !tags.some(tag => tag.name === name))
                .filter(Boolean);

            gameTags = [...new Set(gameTags)];
            if(Array.isArray(gameTags) && gameTags.length) {
                await fetchTags(gameTags);
            }

            let gamePlatforms = game.platforms?.map(platform => platform.platform.name)
                .filter(name => !platforms.some(platform => platform.name === name))
                .filter(Boolean);

            gamePlatforms = [...new Set(gamePlatforms)];
            if(Array.isArray(gamePlatforms) && gamePlatforms.length) {
                await fetchPlatforms(gamePlatforms);
            }

            const tagsToAdd = gameTags?.map(name => tags.find(tag => tag.name === name));
            const platformsToAdd = gamePlatforms?.map(name => platforms.find(platform => platform.name === name));

            await new Promise((resolve) => setTimeout(resolve, 5000));

            const { description } = await axios.get(`https://api.rawg.io/api/games/${game.id}?key=${RAWG_API_KEY}`);

            await Game.create({
                name: game.name,
                slug: game.slug,
                description: description,
                released: game.released ? new Date(game.released) : null,
                image: game.background_image,
                screenshots: game.short_screenshots?.map(screenshot => screenshot.image) ?? [],
                tags: tagsToAdd,
                platforms: platformsToAdd
            });
            console.log(`Game "${game.name}" migrated.`);
        }

        console.log(`${currentPage * pageSize}/${count} games migrated. ${pageCount - currentPage} pages left.`);
    }

    console.log('Migration completed.');
})().catch((e) => console.error("Rawg migration script threw an error:", e, {
    START,
    count,
    pageCount,
    currentPage,
    pageSize
}));

async function fetchTags(newTags) {
    if(Array.isArray(newTags) && newTags.length) {
        await Tag.create(newTags.map(name => ({ name })));
    }

    tags = await Tag.find().select({ _id: 1, name: 1 });
}

async function fetchPlatforms(newPlatforms) {
    if(Array.isArray(newPlatforms) && newPlatforms.length) {
        await Platform.create(newPlatforms.map(name => ({ name })));
    }

    platforms = await Platform.find().select({ _id: 1, name: 1 });
}
