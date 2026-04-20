const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Lỗi validation', errors: messages });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ message: `${field} đã tồn tại` });
  }

  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Lỗi server' });
};

module.exports = errorHandler;