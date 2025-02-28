const jwt = require('jsonwebtoken');

const auth = (model) => async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await model.findById(decoded.id);
    
    if (!user) {
      throw new Error();
    }

    // Set both model-specific and generic user properties
    req[model.modelName.toLowerCase()] = user;  // For backwards compatibility with society routes
    req.user = user;  // For backwards compatibility with fire-station routes
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

module.exports = auth;