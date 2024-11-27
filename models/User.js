import { Schema, model } from 'mongoose';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

const gamesRef = [{
    type: Schema.Types.ObjectId,
    ref: 'Game',
}];

const userSchema = new Schema({
    username: String,
    firstName: String,
    lastName: String,
    email: String,
    password: String,
    wishlisted: gamesRef,
    lists: {
        wantToPlay: gamesRef,
        playing: gamesRef,
        completed: gamesRef,
        paused: gamesRef,
        dropped: gamesRef,
    },
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

export default model('User', userSchema);
