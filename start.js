import createApp from './index.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import createMailingService from './utils/emailer.js';
import createImageService from './utils/imageProvider.js';
import seedDb from './seedDb.js';

if(process.env.NODE_ENV === 'development') {
    dotenv.config({ path: '.env.development' });
}

await mongoose.connect(process.env.DB_CONNECTION_STRING);
await seedDb();

const mailService = await createMailingService();

const imageService = await createImageService();

const app = await createApp(mailService, imageService);

app.listen(3131, async () => {
    console.info('All About Games server is running! http://localhost:3131');
});
