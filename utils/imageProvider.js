import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';

export default async function createImageService() {
    const s3 = new S3Client({
        region: process.env.S3_REGION,
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_KEY,
        },
        forcePathStyle: true,
    });

    return {
        saveImagesToS3: (args) => saveImagesToS3(s3, args),
        deleteImagesFromS3: (args) => deleteImagesFromS3(s3, args),
        updateImagesInS3: (args) => updateImagesInS3(s3, args),
    }
}

async function saveImagesToS3(s3, { path, images }) {
    if(!path || images?.length === 0) {
        return [];
    }

    const imageUrls = [];
    const uploadCommands = [];
    for (let index = 0; index < images.length; index++) {
        const image = images[index];
        const fileExtension = image.mimetype.split('/')[1];
        const filePath = `${path}/${index + 1}.${fileExtension}`;

        const uploadCommand = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: filePath,
            Body: image.buffer,
            ACL: "public-read",
        });
        uploadCommands.push(s3.send(uploadCommand));
        imageUrls.push(`${process.env.S3_CDN_URL}/${process.env.S3_BUCKET_NAME}/${filePath}`);
    }

    try {
        await Promise.all(uploadCommands);
    } catch (error) {
        console.error("Failed to upload images", error);

        throw {
            status: 500,
            message: 'Failed to upload images',
        };
    }

    return imageUrls;
}

async function deleteImagesFromS3(s3, { imageUrls }) {
    if(imageUrls.length === 0) {
        return;
    }

    try {
        const deleteCommands = imageUrls.map((imageUrl) => {
            return s3.send(new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key:  (new URL(imageUrl)).pathname.slice(`/${process.env.S3_BUCKET_NAME}/`.length),
            }));
        });

        await Promise.all(deleteCommands);
    } catch(error) {
        console.error("Failed to delete images", error);

        throw {
            status: 500,
            message: 'Failed to delete images',
        };
    }
}

async function updateImagesInS3(s3, { path, newImages, oldImageUrls }) {
    try {
        await deleteImagesFromS3(s3, { imageUrls: oldImageUrls });

        return await saveImagesToS3(s3, { path, images: newImages });
    } catch(error) {
        console.error("Failed to upload images", error);

        throw {
            status: 500,
            message: 'Failed to upload images',
        };
    }
}
