import { Request, Response } from 'express';
import { generatePresignedUploadUrl } from '../utils/r2';

export class MediaController {
  /**
   * Generates a presigned URL for direct client-to-R2 upload
   */
  static getPresignedUrl = async (req: Request, res: Response) => {
    try {
      const { fileName, contentType, folder = 'curriculum' } = req.body;

      if (!fileName || !contentType) {
        return res.status(400).json({
          success: false,
          message: 'fileName and contentType are required'
        });
      }

      const result = await generatePresignedUploadUrl(fileName, contentType, folder);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error generating presigned URL:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate upload URL',
        error: error.message
      });
    }
  };
}
