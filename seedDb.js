import mongoose from "mongoose";
import User from "./models/User.js";
import Tag from "./models/Tag.js";
import Platform from "./models/Platform.js";
import Game from "./models/Game.js";

export default async function () {
    // check if db has data and return if so, otherwise seed db
    const collections = await mongoose.connection.db.listCollections().toArray();
    for(const { name } of collections) {
        if(await mongoose.connection.db.collection(name).countDocuments()) {
            return;
        }
    }

    // seed users
    await User.create([
        {
            username: 'a',
            firstName: 'a',
            lastName: 'a',
            email: 'a@a.a',
            password: 'a',
            role: 'user',
            verified: true,
        },
        {
            username: 'admin',
            firstName: 'admin',
            lastName: 'admin',
            email: 'admin@admin.admin',
            password: 'admin',
            role: 'admin',
            verified: true,
        },
    ]);

    // seed tags
    const tags = await Tag.create([
        { name: 'Action' },
        { name: 'Adventure' },
        { name: 'RPG' },
        { name: 'Strategy' },
        { name: 'Simulation' },
        { name: 'Puzzle' },
        { name: 'Sports' },
        { name: 'Racing' },
        { name: 'Horror' },
        { name: 'Shooter' },
    ]);

    // seed platforms
    const platforms = await Platform.create([
        { name: 'PC' },
        { name: 'PlayStation' },
        { name: 'Xbox' },
        { name: 'Nintendo Switch' },
        { name: 'Mobile' },
    ]);

    // seed games
    await Game.create([
        {
            name: 'Game 1',
            slug: 'game-1',
            description: 'Description for Game 1',
            releaseDate: new Date(),
            image: 'https://example.com/game1.jpg',
            screenshots: ['https://example.com/game1-1.jpg', 'https://example.com/game1-2.jpg'],
            tags: [tags.find(tag => tag.name === 'Action')],
            platforms: [platforms.find(platform => platform.name === 'PC')],
        },
        {
            name: 'Game 2',
            slug: 'game-2',
            description: 'Description for Game 2',
            releaseDate: new Date(),
            image: 'https://example.com/game2.jpg',
            screenshots: ['https://example.com/game2-1.jpg', 'https://example.com/game2-2.jpg'],
            tags: [tags.find(tag => tag.name === 'Adventure')],
            platforms: [platforms.find(platform => platform.name === 'PlayStation')],
        },
    ]);
}
