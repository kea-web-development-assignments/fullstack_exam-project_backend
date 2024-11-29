import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';

const gamesRef = [{
    type: Schema.Types.ObjectId,
    ref: 'Game',
}];

const userSchema = new Schema({
    username: {
        type: String,
        unique: true,
    },
    firstName: String,
    lastName: String,
    email: {
        type: String,
        unique: true,
    },
    password: String,
    gameLists: [{
        list: {
            type: String,
            enum: [ 'want-to-play', 'playing', 'completed', 'paused', 'dropped' ],
            default: 'want-to-play',
        },
        game: {
            type: Schema.Types.ObjectId,
            ref: 'Game',
        },
    }],
    role: {
        type: String,
        enum: [ 'user', 'admin' ],
        default: 'user',
    },
    verified: {
        type: Boolean,
        default: false,
    },
    verificationCode: {
        code: String,
        createdAt: Date,
    },
    passwordResetCode: {
        code: String,
        createdAt: Date,
    },
    deletedAt: {
        type: Date,
        default: undefined,
    },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
    if(this.password) {
        this.password = await bcrypt.hash(this.password, 10);
    }

    next();
});

userSchema.pre('updateOne', async function(next) {
    if(this.get('password')) {
        this.set('password', await bcrypt.hash(this.get('password'), 10));
    }

    next();
});

userSchema.pre('findOneAndUpdate', async function(next) {
    if(this.get('password')) {
        this.set('password', await bcrypt.hash(this.get('password'), 10));
    }

    next();
});

userSchema.static('login', async function({ email, password }) {
    const user = await this.model('User').findOne({ email });

    if(!user) {
        return;
    }

    const result = await bcrypt.compare(password, user.password);

    if(!result) {
        return;
    }

    return user;
});

export default model('User', userSchema, 'users');
