import { Schema, model } from 'mongoose';

const gameSchema = new Schema({
    name: String,
    slug: {
        type: String,
        unique: true,
    },
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

gameSchema.index({ name: 'text', description: 'text' });

export default model('Game', gameSchema, 'games');
