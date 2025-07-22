import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory for fallback
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Check if S3 is properly configured
const isS3Configured = () => {
    return process.env.AWS_ACCESS_KEY_ID && 
           process.env.AWS_SECRET_ACCESS_KEY && 
           process.env.AWS_REGION && 
           process.env.AWS_S3_BUCKET_NAME;
};

// Configure AWS only if credentials are available
let s3;
if (isS3Configured()) {
    AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION
    });
    s3 = new AWS.S3();
}

export const uploadToS3 = async (base64Data, fileName) => {
    try {
        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        
        // Use S3 if configured, otherwise fallback to local storage
        if (isS3Configured() && s3) {
            const params = {
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: `posts/${Date.now()}-${fileName}`,
                Body: buffer,
                ContentType: 'image/jpeg',
                ACL: 'public-read'
            };

            const result = await s3.upload(params).promise();
            console.log('Image uploaded to S3:', result.Location);
            return result.Location;
        } else {
            // Fallback to local storage
            console.log('S3 not configured, using local storage fallback');
            const uniqueFileName = `${Date.now()}-${fileName}`;
            const filePath = path.join(uploadsDir, uniqueFileName);
            
            fs.writeFileSync(filePath, buffer);
            return `/uploads/${uniqueFileName}`;
        }
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
};

export const deleteFromS3 = async (imageUrl) => {
    try {
        if (!imageUrl) return;
        
        if (imageUrl.includes('amazonaws.com') && isS3Configured() && s3) {
            // Delete from S3
            const urlParts = imageUrl.split('/');
            const key = urlParts.slice(-2).join('/');
            
            const params = {
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: key
            };

            await s3.deleteObject(params).promise();
            console.log('Image deleted from S3');
        } else if (imageUrl.startsWith('/uploads/')) {
            // Delete from local storage
            const fileName = path.basename(imageUrl);
            const filePath = path.join(uploadsDir, fileName);
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('Image deleted from local storage');
            }
        }
    } catch (error) {
        console.error('Delete error:', error);
        // Don't throw error for file deletion failures
    }
};
