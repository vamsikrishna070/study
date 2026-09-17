export function perfLogger(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    return next();
  }

  const start = process.hrtime.bigint();
  const method = req.method;
  const path = req.originalUrl || req.url;

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    // Only log if not a simple health-check or root
    if (path.startsWith('/api')) {
      console.log(`[PERF] ${method} ${path} -> ${res.statusCode} in ${durationMs.toFixed(1)}ms`);
    }
  });

  next();
}
