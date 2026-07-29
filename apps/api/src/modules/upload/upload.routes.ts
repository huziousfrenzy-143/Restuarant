import { Router, Request, Response } from 'express';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

// Upload Image to Cloudinary Endpoint
router.post('/upload', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { image, file, folder } = req.body;
    const imageData = image || file;

    if (!imageData) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Image base64 data URI or file string is required' } });
    }

    const targetFolder = folder || 'restaurant_saas_products';
    const uploadResult = await uploadImageToCloudinary(imageData, targetFolder);

    return res.json({
      success: true,
      data: uploadResult,
      message: 'Image uploaded successfully to Cloudinary!'
    });
  } catch (err: any) {
    return res.status(500).json({
      error: {
        code: 'CLOUDINARY_UPLOAD_FAILED',
        message: err.message || 'Error processing Cloudinary image upload'
      }
    });
  }
});

// Organization Scoped Upload Endpoint
router.post('/:orgId/upload', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { image, file, folder } = req.body;
    const imageData = image || file;

    if (!imageData) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Image base64 data URI or file string is required' } });
    }

    const targetFolder = folder || `restaurants/${orgId}`;
    const uploadResult = await uploadImageToCloudinary(imageData, targetFolder);

    return res.json({
      success: true,
      data: uploadResult,
      message: `Image uploaded successfully for store ${orgId}!`
    });
  } catch (err: any) {
    return res.status(500).json({
      error: {
        code: 'CLOUDINARY_UPLOAD_FAILED',
        message: err.message || 'Error processing Cloudinary image upload'
      }
    });
  }
});

export default router;
