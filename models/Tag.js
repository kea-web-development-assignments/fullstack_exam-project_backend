import { Schema, model } from 'mongoose';

const tagSchema = new Schema({
    name: {
        type: String,
        unique: true,
    },
}, { timestamps: true });

export default model('Tag', tagSchema, 'tags');
