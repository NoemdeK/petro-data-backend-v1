import * as formidable from 'formidable';
import { RequestHandler, Request, Response, NextFunction } from 'express';

export const FormidableGuard: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const form = new formidable.IncomingForm();

  form.parse(req, (err, fields, files) => {
    if (err) {
      return next(err);
    }

    req.body = fields;
    req.files = files;
    next();
  });
};
