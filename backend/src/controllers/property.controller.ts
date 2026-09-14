import { Request, Response } from 'express';
import { PropertyService } from '../services/property.service.js';
import { ResponseUtil } from '../utils/response.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class PropertyController {
  /**
   * @route   GET /api/v1/admin/properties
   * @desc    Get all properties with pagination and filters
   * @access  Admin
   */
  static getAllProperties = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, status, min_price, max_price, search } = req.query;

    const result = await PropertyService.getAllProperties(
      page ? parseInt(page as string) : 1,
      limit ? parseInt(limit as string) : 10,
      {
        status,
        min_price: min_price ? parseFloat(min_price as string) : undefined,
        max_price: max_price ? parseFloat(max_price as string) : undefined,
        search,
      }
    );

    return ResponseUtil.success(res, result);
  });

  /**
   * @route   GET /api/v1/admin/properties/stats
   * @desc    Get property statistics
   * @access  Admin
   */
  static getPropertyStats = asyncHandler(async (req: Request, res: Response) => {
    const result = await PropertyService.getPropertyStats();

    return ResponseUtil.success(res, result);
  });

  /**
   * @route   GET /api/v1/admin/properties/:id
   * @desc    Get single property details
   * @access  Admin
   */
  static getPropertyById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await PropertyService.getPropertyById(id);

    return ResponseUtil.success(res, result);
  });

  /**
   * @route   POST /api/v1/admin/properties
   * @desc    Create new property
   * @access  Admin
   */
  static createProperty = asyncHandler(async (req: Request, res: Response) => {
    const { title, description, image_url, price, status } = req.body;

    const result = await PropertyService.createProperty({
      title,
      description,
      image_url,
      price,
      status,
    });

    return ResponseUtil.created(
      res,
      result,
      'Property created successfully'
    );
  });

  /**
   * @route   PUT /api/v1/admin/properties/:id
   * @desc    Update property
   * @access  Admin
   */
  static updateProperty = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { title, description, image_url, price, status } = req.body;

    const result = await PropertyService.updateProperty(id, {
      title,
      description,
      image_url,
      price,
      status,
    });

    return ResponseUtil.success(
      res,
      result,
      'Property updated successfully'
    );
  });

  /**
   * @route   DELETE /api/v1/admin/properties/:id
   * @desc    Delete property (soft delete by default, hard delete with ?hard=true)
   * @access  Admin
   */
  static deleteProperty = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { hard } = req.query;

    const hardDelete = hard === 'true';

    const result = await PropertyService.deleteProperty(id, hardDelete);

    return ResponseUtil.success(
      res,
      result,
      hardDelete 
        ? 'Property permanently deleted' 
        : 'Property deactivated (soft delete)'
    );
  });
}
