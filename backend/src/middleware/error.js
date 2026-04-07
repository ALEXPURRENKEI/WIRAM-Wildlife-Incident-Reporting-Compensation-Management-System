function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  const status = err.status || err.statusCode || (err.code === "23505" ? 409 : 500);
  const isClientError = status >= 400 && status < 500;
  const payload = {
    error: isClientError ? err.message : "Internal server error"
  };

  if (err.details) {
    payload.details = err.details;
  }

  if (!isClientError && process.env.NODE_ENV !== "production") {
    payload.details = payload.details || err.message;
  }

  console.error(err);
  res.status(status).json(payload);
}

module.exports = {
  errorHandler: errorHandler
};
