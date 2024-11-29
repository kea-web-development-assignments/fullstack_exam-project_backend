import { Schema, model } from 'mongoose';

const gameSchema = new Schema({
    name: String,
    slug: String,
    description: String,
    releaseDate: Date,
    image: String,
    screenshots: [String],
    tags: [{
        _id: String,
        name: String,
    }],
    platforms: [{
        _id: String,
        name: String,
    }],
    published: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

export default model('Game', gameSchema, 'games');
