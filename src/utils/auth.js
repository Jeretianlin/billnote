const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
require('dotenv').config();

function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      success: false, 
      error: '请先登录' 
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ 
      success: false, 
      error: '登录已过期，请重新登录' 
    });
  }

  db.get('SELECT id, name, username, role FROM users WHERE id = ?', [decoded.id], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        success: false, 
        error: '数据库错误' 
      });
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: '用户不存在' 
      });
    }

    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      error: '需要管理员权限' 
    });
  }
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateUser,
  requireAdmin
};
