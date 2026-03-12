const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../config/db');
const { authenticateUser, requireAdmin } = require('../utils/auth');

const router = express.Router();

// 获取用户列表（用于选择参与者，只返回有效的非管理员用户）
router.get('/list', authenticateUser, (req, res) => {
  db.all(`
    SELECT id, name
    FROM users
    WHERE role != 'admin' AND status = 'active'
    ORDER BY name
  `, [], (err, users) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, data: users });
  });
});

// 获取所有用户余额（仅admin）
router.get('/balances', authenticateUser, requireAdmin, (req, res) => {
  const { userId, startDate, endDate } = req.query;
  
  let query = `
    SELECT 
      u.id as user_id,
      u.name,
      u.status,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN tp.share_amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN tp.share_amount ELSE 0 END), 0) as total_expense,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN tp.share_amount 
                        WHEN t.type = 'expense' THEN -tp.share_amount 
                        ELSE 0 END), 0) as net_balance
    FROM users u
    LEFT JOIN transaction_participants tp ON u.id = tp.user_id
    LEFT JOIN transactions t ON tp.transaction_id = t.id
    WHERE u.role != 'admin'
  `;
  
  const params = [];
  
  if (userId) {
    query += ' AND u.id = ?';
    params.push(userId);
  }
  
  if (startDate) {
    query += ' AND t.date >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND t.date <= ?';
    params.push(endDate);
  }
  
  query += ' GROUP BY u.id, u.name, u.status ORDER BY u.name ASC';
  
  db.all(query, params, (err, balances) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, data: balances || [] });
  });
});

// 导出用户余额为CSV（仅admin）
router.get('/balances/export', authenticateUser, requireAdmin, (req, res) => {
  const { userId, startDate, endDate } = req.query;
  
  let query = `
    SELECT 
      u.id as user_id,
      u.name,
      u.status,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN tp.share_amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN tp.share_amount ELSE 0 END), 0) as total_expense,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN tp.share_amount 
                        WHEN t.type = 'expense' THEN -tp.share_amount 
                        ELSE 0 END), 0) as net_balance
    FROM users u
    LEFT JOIN transaction_participants tp ON u.id = tp.user_id
    LEFT JOIN transactions t ON tp.transaction_id = t.id
    WHERE u.role != 'admin'
  `;
  
  const params = [];
  
  if (userId) {
    query += ' AND u.id = ?';
    params.push(userId);
  }
  
  if (startDate) {
    query += ' AND t.date >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND t.date <= ?';
    params.push(endDate);
  }
  
  query += ' GROUP BY u.id, u.name, u.status ORDER BY u.name ASC';
  
  db.all(query, params, (err, balances) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    
    const now = new Date();
    const exportDate = now.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const dateRange = startDate && endDate 
      ? `${startDate} 至 ${endDate}` 
      : '全部历史数据';
    
    let csv = '\uFEFF';
    csv += '账单笔记 - 用户余额报表\n';
    csv += `导出日期：${exportDate}\n`;
    csv += `查询日期范围：${dateRange}\n`;
    csv += '从系统一键导出，是本系统的权威输出\n\n';
    csv += '用户ID,姓名,状态,总收入,总支出,净余额\n';
    
    if (balances && balances.length > 0) {
      balances.forEach(user => {
        const statusText = user.status === 'active' ? '有效' : '无效';
        csv += `${user.user_id},${user.name},${statusText},${user.total_income.toFixed(2)},${user.total_expense.toFixed(2)},${user.net_balance.toFixed(2)}\n`;
      });
    }
    
    const filename = `user-balances-${now.toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  });
});

// 获取所有用户（仅admin）
router.get('/', authenticateUser, requireAdmin, (req, res) => {
  db.all(`
    SELECT id, name, username, role, status, join_date, created_at
    FROM users
    ORDER BY id ASC
  `, [], (err, users) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, data: users });
  });
});

// 获取单个用户（仅admin）
router.get('/:id', authenticateUser, requireAdmin, (req, res) => {
  db.get(`
    SELECT id, name, username, role, status, join_date, created_at
    FROM users
    WHERE id = ?
  `, [req.params.id], (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }
    res.json({ success: true, data: user });
  });
});

// 新增用户（仅admin）
router.post('/', authenticateUser, requireAdmin, (req, res) => {
  const { name, username, password } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({ success: false, error: '姓名、用户名和密码不能为空' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, error: '密码长度至少6位' });
  }

  db.get('SELECT id FROM users WHERE username = ?', [username], (err, existingUser) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (existingUser) {
      return res.status(400).json({ success: false, error: '用户名已存在' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(`
      INSERT INTO users (name, username, password_hash, role, status)
      VALUES (?, ?, ?, 'member', 'active')
    `, [name, username, hashedPassword], function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }

      db.get('SELECT id, name, username, role, status FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        res.status(201).json({ success: true, message: '用户创建成功', user: newUser });
      });
    });
  });
});

// 修改用户信息
router.put('/:id', authenticateUser, (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (req.user.id != userId && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: '无权修改此用户信息' });
  }

  const { name, username } = req.body;

  if (!name || !username) {
    return res.status(400).json({ success: false, error: '姓名和用户名不能为空' });
  }

  db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId], (err, existingUser) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (existingUser) {
      return res.status(400).json({ success: false, error: '用户名已存在' });
    }

    db.run(`
      UPDATE users SET name = ?, username = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, username, userId], (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }

      db.get('SELECT id, name, username, role, status FROM users WHERE id = ?', [userId], (err, updatedUser) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, message: '用户信息修改成功', user: updatedUser });
      });
    });
  });
});

// 启用/禁用用户（仅admin）
router.put('/:id/status', authenticateUser, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ success: false, error: '状态值无效' });
  }

  // 检查是否是admin自己
  db.get('SELECT id, role FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    // admin不能被禁用
    if (user.role === 'admin' && status === 'inactive') {
      return res.status(400).json({ success: false, error: '管理员不能被禁用' });
    }

    db.run(`
      UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, userId], (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }

      db.get('SELECT id, name, username, role, status FROM users WHERE id = ?', [userId], (err, updatedUser) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ 
          success: true, 
          message: status === 'active' ? '用户已启用' : '用户已禁用', 
          user: updatedUser 
        });
      });
    });
  });
});

// 重置密码（仅admin，无需当前密码）
router.post('/:id/reset-password', authenticateUser, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ success: false, error: '新密码不能为空' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: '密码长度至少6位' });
  }

  db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    db.run(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [hashedPassword, userId], (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true, message: '密码重置成功' });
    });
  });
});

// 修改密码（用户自己修改，需要当前密码）
router.put('/:id/password', authenticateUser, (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (req.user.id != userId && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: '无权修改此用户密码' });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: '当前密码和新密码不能为空' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: '新密码长度至少6位' });
  }

  db.get('SELECT password_hash FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(400).json({ success: false, error: '当前密码错误' });
    }

    const newHashedPassword = bcrypt.hashSync(newPassword, 10);

    db.run(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newHashedPassword, userId], (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true, message: '密码修改成功' });
    });
  });
});

// 获取用户余额
router.get('/:id/balance', authenticateUser, (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (req.user.id != userId && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: '无权访问' });
  }

  // 如果是admin查看自己的余额，返回全局统计
  if (req.user.role === 'admin' && userId === req.user.id) {
    db.get(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount 
                          WHEN type = 'expense' THEN -amount 
                          ELSE 0 END), 0) as net_balance
      FROM transactions
    `, [], (err, globalSummary) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ 
        success: true, 
        data: {
          user_id: userId,
          name: req.user.name,
          total_income: globalSummary ? globalSummary.total_income : 0,
          total_expense: globalSummary ? globalSummary.total_expense : 0,
          net_balance: globalSummary ? globalSummary.net_balance : 0,
          is_global: true
        }
      });
    });
    return;
  }

  // 普通用户查看自己的余额
  db.get(`
    SELECT 
      u.id as user_id,
      u.name,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN tp.share_amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN tp.share_amount ELSE 0 END), 0) as total_expense,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN tp.share_amount 
                        WHEN t.type = 'expense' THEN -tp.share_amount 
                        ELSE 0 END), 0) as net_balance
    FROM users u
    LEFT JOIN transaction_participants tp ON u.id = tp.user_id
    LEFT JOIN transactions t ON tp.transaction_id = t.id
    WHERE u.id = ?
    GROUP BY u.id, u.name
  `, [userId], (err, balanceSummary) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }

    if (!balanceSummary) {
      db.get('SELECT name FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ 
          success: true, 
          data: {
            user_id: userId,
            name: user ? user.name : '',
            total_income: 0,
            total_expense: 0,
            net_balance: 0
          }
        });
      });
    } else {
      res.json({ success: true, data: balanceSummary });
    }
  });
});

// 获取用户交易记录
router.get('/:id/transactions', authenticateUser, (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (req.user.id != userId && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: '无权访问' });
  }
  
  const { page = 1, limit = 20, startDate, endDate, type } = req.query;

  let query = `
    SELECT 
      u.id as user_id,
      u.name,
      t.id as transaction_id,
      t.type,
      t.amount,
      t.description,
      t.date,
      tp.share_amount,
      tp.remark,
      t.creator_user_id,
      creator.name as creator_name,
      t.created_at
    FROM users u
    JOIN transaction_participants tp ON u.id = tp.user_id
    JOIN transactions t ON tp.transaction_id = t.id
    JOIN users creator ON creator.id = t.creator_user_id
    WHERE u.id = ?
  `;
  const params = [userId];

  if (startDate) {
    query += ` AND t.date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND t.date <= ?`;
    params.push(endDate);
  }
  if (type) {
    query += ` AND t.type = ?`;
    params.push(type);
  }

  query += ` ORDER BY t.date DESC, t.created_at DESC`;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ` LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  db.all(query, params, (err, userTransactions) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }

    let runningBalance = 0;
    const transactionsWithRunningBalance = userTransactions.map(tx => {
      if (tx.type === 'income') {
        runningBalance += parseFloat(tx.share_amount);
      } else {
        runningBalance -= parseFloat(tx.share_amount);
      }
      return {
        ...tx,
        running_balance: parseFloat(runningBalance.toFixed(2))
      };
    });

    let countQuery = `SELECT COUNT(*) as count FROM transaction_participants tp JOIN transactions t ON tp.transaction_id = t.id WHERE tp.user_id = ?`;
    const countParams = [userId];

    if (startDate) {
      countQuery += ` AND t.date >= ?`;
      countParams.push(startDate);
    }
    if (endDate) {
      countQuery += ` AND t.date <= ?`;
      countParams.push(endDate);
    }
    if (type) {
      countQuery += ` AND t.type = ?`;
      countParams.push(type);
    }

    db.get(countQuery, countParams, (err, countResult) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ 
        success: true, 
        data: transactionsWithRunningBalance,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult ? countResult.count : 0
        }
      });
    });
  });
});

module.exports = router;