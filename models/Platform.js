import { Schema, model } from 'mongoose';

const platformSchema = new Schema({
    name: {
        type: String,
        unique: true,
    },
}, { timestamps: true });

export default model('Platform', platformSchema, 'platforms');
