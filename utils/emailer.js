import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';

export default async function createMailingService() {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        } : undefined,
    });
    
    transporter.use('compile', hbs({
        viewEngine: {
            extname: '.handlebars',
            defaultLayout: false
        },
        viewPath: 'views/',
    }));

    return {
        sendVerificationMail: (user) => sendVerificationMail(transporter, user),
        sendPasswordResetMail: (user) => sendPasswordResetMail(transporter, user),
        sendAccountDeletedMail: (user) => sendAccountDeletedMail(transporter, user),
    }
}

const from = 'AllAboutGames <mailer@allaboutgames.xyz>';

async function sendVerificationMail(transporter, { email, firstName, verificationCode }) {
    await transporter.sendMail({
        from,
        to: process.env.SMTP_TEST_EMAIL ? process.env.SMTP_TEST_EMAIL : email,
        subject: 'AllAboutGames account requires verification',
        template: 'verify-account',
        context: {
            name: firstName,
            code: verificationCode,
            url: process.env.FRONTEND_URL,
        },
    });
}

async function sendPasswordResetMail(transporter, { email, firstName, resetCode }) {
    await transporter.sendMail({
        from,
        to: process.env.SMTP_TEST_EMAIL ? process.env.SMTP_TEST_EMAIL : email,
        subject: 'Reset link for your AllAboutGames account',
        template: 'reset-password',
        context: {
            name: firstName,
            code: resetCode,
            url: process.env.FRONTEND_URL,
        },
    });
}

async function sendAccountDeletedMail(transporter, { email, firstName }) {
    await transporter.sendMail({
        from,
        to: process.env.SMTP_TEST_EMAIL ? process.env.SMTP_TEST_EMAIL : email,
        subject: 'Your AllAboutGames account has been deleted',
        template: 'deleted-account',
        context: {
            name: firstName,
        },
    });
}
