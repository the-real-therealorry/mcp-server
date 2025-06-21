import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const schemas = {
  zipUpload: Joi.object({
    extract_to: Joi.string().default('extracted'),
    overwrite: Joi.string().valid('true', 'false').default('false'),
    preserve_structure: Joi.string().valid('true', 'false').default('true'),
  }),

  contextQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('all', 'pending', 'approved', 'rejected').default('all'),
    type: Joi.string().valid('all', 'zip', 'file', 'directory').default('all'),
    search: Joi.string().optional(),
  }),

  contextApproval: Joi.object({
    context_id: Joi.string().required(),
    approved: Joi.boolean().required(),
    reason: Joi.string().optional(),
  }),

  snapshot: Joi.object({
    include_logs: Joi.boolean().default(true),
    include_context: Joi.boolean().default(true),
    include_files: Joi.boolean().default(false),
  }),
};

export const validateZipUpload = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = schemas.zipUpload.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details.map(d => d.message),
    });
  }
  
  req.body = value;
  return next();
};

export const validateContextQuery = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = schemas.contextQuery.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details.map(d => d.message),
    });
  }
  
  req.query = value;
  return next();
};

export const validateContextApproval = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = schemas.contextApproval.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details.map(d => d.message),
    });
  }
  
  req.body = value;
  return next();
};

export const validateSnapshot = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = schemas.snapshot.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details.map(d => d.message),
    });
  }
  
  req.body = value;
  return next();
};