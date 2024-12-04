import mongoose from "mongoose";
import User from "./models/User.js";
import Tag from "./models/Tag.js";
import Platform from "./models/Platform.js";
import Game from "./models/Game.js";

export default async function () {
    // seed users
    if(!(await mongoose.connection.db.collection('users').countDocuments())) {
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
    }

    // seed tags
    let tags;
    if(!(await mongoose.connection.db.collection('tags').countDocuments())) {
        tags = await Tag.create([
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
    }

    // seed platforms
    let platforms;
    if(!(await mongoose.connection.db.collection('platforms').countDocuments())) {
        platforms = await Platform.create([
            { name: 'PC' },
            { name: 'PS4' },
            { name: 'PS5' },
            { name: 'Xbox One' },
            { name: 'Xbox Series S' },
            { name: 'Xbox Series X' },
            { name: 'Nintendo Switch' },
            { name: 'Mobile' },
        ]);
    }

    // seed games
    if(!(await mongoose.connection.db.collection('games').countDocuments())) {
        await Game.create([
            {
                name: 'Game 1',
                slug: 'game-1',
                description: 'Description for Game 1',
                releaseDate: new Date(),
                image: 'https://example.com/game1.jpg',
                screenshots: ['https://example.com/game1-1.jpg', 'https://example.com/game1-2.jpg'],
                tags: tags ? [tags.find(tag => tag.name === 'Action')] : [],
                platforms: platforms ? [platforms.find(platform => platform.name === 'PC')] : [],
            },
            {
                name: 'Game 2',
                slug: 'game-2',
                description: 'Description for Game 2',
                releaseDate: new Date(),
                image: 'https://example.com/game2.jpg',
                screenshots: ['https://example.com/game2-1.jpg', 'https://example.com/game2-2.jpg'],
                tags: tags ? [tags.find(tag => tag.name === 'Adventure')] : [],
                platforms: platforms ? [platforms.find(platform => platform.name === 'PlayStation')] : [],
            },
        ]);
    }
}
