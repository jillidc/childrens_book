const AWS = require('aws-sdk');
require('dotenv').config();

// Configure DigitalOcean Spaces (S3-compatible)
const spacesEndpoint = new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT);
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
  region: process.env.DO_SPACES_REGION,
  signatureVersion: 'v4'
});

const BUCKET_NAME = process.env.DO_SPACES_BUCKET;

class StorageService {
  constructor() {
    this.s3 = s3;
    this.bucketName = BUCKET_NAME;
  }

  // Upload file to DigitalOcean Spaces
  async uploadFile(fileBuffer, fileName, mimeType, folder = 'images') {
    const key = `${folder}/${Date.now()}-${fileName}`;

    const params = {
      Bucket: this.bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: 'public-read', // Make file publicly accessible
      CacheControl: 'public, max-age=31536000' // Cache for 1 year
    };

    try {
      const result = await this.s3.upload(params).promise();
      console.log('✅ File uploaded successfully:', result.Location);

      return {
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket,
        etag: result.ETag
      };
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      throw new Error('Failed to upload file to storage');
    }
  }

  // Upload image with processing
  async uploadImage(fileBuffer, originalName, options = {}) {
    try {
      const {
        maxWidth = 1200,
        maxHeight = 1200,
        quality = 85,
        format = 'jpeg'
      } = options;

      // Process image with Sharp (resize and optimize)
      const sharp = require('sharp');
      const processedBuffer = await sharp(fileBuffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: quality })
        .toBuffer();

      // Generate unique filename
      const ext = format === 'jpeg' ? 'jpg' : format;
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const mimeType = `image/${format}`;

      return await this.uploadFile(processedBuffer, fileName, mimeType, 'drawings');
    } catch (error) {
      console.error('Error processing and uploading image:', error);
      throw error;
    }
  }

  // Delete file from storage
  async deleteFile(key) {
    const params = {
      Bucket: this.bucketName,
      Key: key
    };

    try {
      await this.s3.deleteObject(params).promise();
      console.log('✅ File deleted successfully:', key);
      return true;
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      throw new Error('Failed to delete file from storage');
    }
  }

  // Get file URL (for private files with signed URLs)
  getSignedUrl(key, expiresIn = 3600) {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Expires: expiresIn // URL expires in seconds
    };

    try {
      return this.s3.getSignedUrl('getObject', params);
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate file access URL');
    }
  }

  // Check if file exists
  async fileExists(key) {
    const params = {
      Bucket: this.bucketName,
      Key: key
    };

    try {
      await this.s3.headObject(params).promise();
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  // List files in a folder
  async listFiles(folder = '', limit = 1000) {
    const params = {
      Bucket: this.bucketName,
      Prefix: folder,
      MaxKeys: limit
    };

    try {
      const result = await this.s3.listObjectsV2(params).promise();
      return result.Contents.map(item => ({
        key: item.Key,
        lastModified: item.LastModified,
        size: item.Size,
        url: `https://${this.bucketName}.${process.env.DO_SPACES_REGION}.digitaloceanspaces.com/${item.Key}`
      }));
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error('Failed to list files');
    }
  }

  // Get storage usage statistics
  async getStorageStats() {
    try {
      const images = await this.listFiles('drawings/');
      const totalSize = images.reduce((acc, file) => acc + file.size, 0);
      const totalFiles = images.length;

      return {
        totalFiles,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        avgFileSize: totalFiles > 0 ? Math.round(totalSize / totalFiles) : 0
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      throw new Error('Failed to get storage statistics');
    }
  }

  // Helper method to format bytes
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Test connection to storage service
  async testConnection() {
    try {
      const params = {
        Bucket: this.bucketName
      };

      await this.s3.headBucket(params).promise();
      console.log('✅ Successfully connected to DigitalOcean Spaces');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to DigitalOcean Spaces:', error.message);
      return false;
    }
  }
}

// Create singleton instance
const storageService = new StorageService();

module.exports = {
  storageService,
  StorageService
};