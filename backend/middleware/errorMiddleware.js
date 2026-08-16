export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.name === 'ValidationError' ? 400
    : error.name === 'CastError' ? 400
      : error.code === 11000 ? 409
        : error.statusCode || 500;
  console.error(error);
  res.status(status).json({
    success: false,
    message: status === 500 ? 'An unexpected server error occurred' : error.message,
  });
}