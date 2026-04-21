const errorHandler = (err, req, res, next) => {
  const safeBody = { ...(req.body || {}) };
  if ('password' in safeBody) safeBody.password = '[REDACTED]';
  if ('newPassword' in safeBody) safeBody.newPassword = '[REDACTED]';

  console.error('[ERROR]', {
    method: req.method,
    path: req.originalUrl,
    message: err.message,
    status: err.status || 500,
    code: err.code,
    body: safeBody,
    stack: err.stack,
  });

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, asyncHandler };
