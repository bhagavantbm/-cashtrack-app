const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.header('Authorization')?.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // IMPORTANT: Set req.user as an object with id field matching decoded payload
    req.user = { id: decoded.userId };

    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
