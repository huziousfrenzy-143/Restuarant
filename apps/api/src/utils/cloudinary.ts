import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with User Credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dvucauhqo',
  api_key: process.env.CLOUDINARY_API_KEY || '388445378816669',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'uENrP1qHmFxk6OwVFNuwrttuzgk'
});

export async function uploadImageToCloudinary(fileDataUriOrBase64: string, folder: string = 'restaurant_saas_uploads') {
  try {
    let uploadStr = fileDataUriOrBase64;
    if (!uploadStr.startsWith('data:image/') && !uploadStr.startsWith('http')) {
      uploadStr = `data:image/jpeg;base64,${fileDataUriOrBase64}`;
    }

    const result = await cloudinary.uploader.upload(uploadStr, {
      folder,
      resource_type: 'image',
      overwrite: true,
      invalidate: true
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    };
  } catch (error: any) {
    console.error('[Cloudinary Upload Error]', error);
    throw new Error(error.message || 'Failed to upload image to Cloudinary');
  }
}

export { cloudinary };
