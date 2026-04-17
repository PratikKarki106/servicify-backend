import * as Minio from 'minio';
import 'dotenv/config';

// Initialize MinIO client
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  pathStyle: process.env.MINIO_USE_PATH_STYLE === 'true'
});

console.log('📦 MinIO Client initialized:', {
  endPoint: process.env.MINIO_ENDPOINT,
  port: process.env.MINIO_PORT,
  accessKey: process.env.MINIO_ACCESS_KEY ? '[SET]' : '[NOT SET]',
  secretKey: process.env.MINIO_SECRET_KEY ? '[SET]' : '[NOT SET]'
});

const bucketName = process.env.MINIO_BUCKET_NAME || 'servicify';

// Auto-create bucket on startup
async function ensureBucketExists() {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      console.log('📦 Creating MinIO bucket:', bucketName);
      await minioClient.makeBucket(bucketName);
      console.log('✅ MinIO bucket created:', bucketName);
    } else {
      console.log('✅ MinIO bucket already exists:', bucketName);
    }
  } catch (error) {
    console.error('❌ Failed to create MinIO bucket:', error.message);
  }
}

// Initialize bucket after a short delay to ensure client is ready
setTimeout(() => {
  ensureBucketExists();
}, 1000);

// Check if MinIO is available
let minioAvailable = null;
async function checkMinioAvailability() {
  if (minioAvailable !== null) return minioAvailable;
  
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName);
    }
    minioAvailable = true;
  } catch (error) {
    console.error('❌ MinIO not available:', error.message);
    minioAvailable = false;
  }
  return minioAvailable;
}

// Upload profile picture
export async function uploadProfilePicture(file, userId) {
  const useMinio = await checkMinioAvailability();
  const timestamp = Date.now();
  
  if (!useMinio) {
    throw new Error('MinIO storage is not available');
  }
  
  const objectName = `profiles/${userId}/${timestamp}_${file.originalname}`;
  
  await minioClient.putObject(
    bucketName,
    objectName,
    file.buffer,
    file.size,
    { 'Content-Type': file.mimetype }
  );
  
  return objectName;
}

// Generate a pre-signed URL for viewing (expires in 1 hour)
export async function getProfilePictureUrl(objectName) {
  const useMinio = await checkMinioAvailability();
  
  if (!useMinio) {
    throw new Error('MinIO storage is not available');
  }
  
  return await minioClient.presignedGetObject(
    bucketName,
    objectName,
    60 * 60
  );
}

// Delete profile picture
export async function deleteProfilePicture(objectName) {
  const useMinio = await checkMinioAvailability();

  if (!useMinio) {
    throw new Error('MinIO storage is not available');
  }

  await minioClient.removeObject(bucketName, objectName);
}

// Upload bluebook image
export async function uploadBluebookImage(file, userId) {
  const useMinio = await checkMinioAvailability();
  const timestamp = Date.now();

  if (!useMinio) {
    throw new Error('MinIO storage is not available');
  }

  const objectName = `bluebooks/${userId}/${timestamp}_${file.originalname}`;

  await minioClient.putObject(
    bucketName,
    objectName,
    file.buffer,
    file.size,
    { 'Content-Type': file.mimetype }
  );

  return objectName;
}

// Generate a pre-signed URL for bluebook image (expires in 1 hour)
export async function getBluebookImageUrl(objectName) {
  const useMinio = await checkMinioAvailability();

  if (!useMinio) {
    throw new Error('MinIO storage is not available');
  }

  return await minioClient.presignedGetObject(
    bucketName,
    objectName,
    60 * 60
  );
}

// Delete bluebook image
export async function deleteBluebookImage(objectName) {
  const useMinio = await checkMinioAvailability();

  if (!useMinio) {
    throw new Error('MinIO storage is not available');
  }

  await minioClient.removeObject(bucketName, objectName);
}