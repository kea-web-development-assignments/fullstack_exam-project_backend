import mongoose from "mongoose";
import User from "./models/User.js";

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
}
