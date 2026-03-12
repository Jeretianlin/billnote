const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../config/db');
const { generateToken, authenticateUser } = require('../utils/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

function dbGet(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      error: '用户名和密码不能为空' 
    });
  }

  try {
    const user = await dbGet(`
      SELECT id, name, username, password_hash, role, status
      FROM users 
      WHERE username = ?
    `, [username]);
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ 
        success: false, 
        error: '用户名或密码错误' 
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ 
        success: false, 
        error: '该用户已被禁用，无法登录' 
      });
    }

    const token = generateToken(user);

    res.json({ 
      success: true, 
      token, 
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ 
      success: false, 
      error: '服务器内部错误' 
    });
  }
});

router.get('/me', authenticateUser, (req, res) => {
  res.json({ 
    success: true,
    user: req.user
  });
});

module.exports = router;
