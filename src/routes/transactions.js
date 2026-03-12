const express = require('express');
const { db } = require('../config/db');
const { authenticateUser, requireAdmin } = require('../utils/auth');

const router = express.Router();

router.get('/', authenticateUser, (req, res) => {
  const { page = 1, limit = 20, startDate, endDate, type } = req.query;
  
  let query = `
    SELECT t.*, u.name as creator_name
    FROM transactions t
    LEFT JOIN users u ON u.id = t.creator_user_id
    WHERE 1=1
  `;
  const params = [];

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

  db.all(query, params, (err, transactions) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }

    const promises = transactions.map(transaction => {
      return new Promise((resolve) => {
        db.all(`
          SELECT u.id, u.name, u.status, tp.share_amount, tp.remark
          FROM transaction_participants tp
          JOIN users u ON u.id = tp.user_id
          WHERE tp.transaction_id = ?
        `, [transaction.id], (err, participants) => {
          if (err) {
            console.error('Database error:', err);
            transaction.participants = [];
          } else {
            transaction.participants = participants;
          }
          resolve();
        });
      });
    });

    Promise.all(promises).then(() => {
      let countQuery = `SELECT COUNT(*) as count FROM transactions t WHERE 1=1`;
      let countParams = [];

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
          console.error('Database error:', err);
          res.json({ 
            success: true, 
            data: transactions,
            pagination: { page: parseInt(page), limit: parseInt(limit), total: 0 }
          });
        } else {
          res.json({ 
            success: true, 
            data: transactions,
            pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult.count || 0 }
          });
        }
      });
    });
  });
});

router.get('/:id', authenticateUser, (req, res) => {
  db.get(`
    SELECT t.*, u.name as creator_name
    FROM transactions t
    LEFT JOIN users u ON u.id = t.creator_user_id
    WHERE t.id = ?
  `, [req.params.id], (err, transaction) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }

    if (!transaction) {
      return res.status(404).json({ success: false, error: '交易不存在' });
    }

    db.all(`
      SELECT u.id, u.name, u.status, tp.share_amount, tp.remark
      FROM transaction_participants tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.transaction_id = ?
    `, [req.params.id], (err, participants) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      transaction.participants = participants;
      res.json({ success: true, data: transaction });
    });
  });
});

router.post('/', authenticateUser, requireAdmin, (req, res) => {
  const { type, amount, description, date, participants } = req.body;

  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ success: false, error: '交易类型无效，必须是"收入"或"支出"' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, error: '金额必须大于0' });
  }

  if (!description || !date) {
    return res.status(400).json({ success: false, error: '描述和日期不能为空' });
  }

  if (!Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({ success: false, error: '至少需要一个参与者' });
  }

  let totalShare = 0;
  for (const participant of participants) {
    if (!participant.user_id || !participant.share_amount || participant.share_amount <= 0) {
      return res.status(400).json({ success: false, error: '每个参与者必须有有效的用户ID和正数分摊金额' });
    }
    totalShare += participant.share_amount;
  }

  if (type === 'expense' && Math.abs(totalShare - amount) > 0.01) {
    return res.status(400).json({ success: false, error: '参与者分摊金额之和必须等于交易总金额' });
  }

  db.run(`
    INSERT INTO transactions (type, amount, description, date, creator_user_id)
    VALUES (?, ?, ?, ?, ?)
  `, [type, amount, description, date, req.user.id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }

    const transactionId = this.lastID;

    const insertParticipants = () => {
      if (participants.length === 0) {
        db.run(`
          INSERT INTO transaction_audit_log (transaction_id, user_id, action, new_values)
          VALUES (?, ?, 'create', ?)
        `, [transactionId, req.user.id, JSON.stringify({ type, amount, description, date, participants })], (err) => {
          if (err) console.error('Audit log error:', err);
        });

        res.status(201).json({ 
          success: true, 
          message: '交易添加成功',
          transactionId
        });
        return;
      }

const participant = participants.shift();
      db.run(`
        INSERT INTO transaction_participants (transaction_id, user_id, share_amount, remark)
        VALUES (?, ?, ?, ?)
      `, [transactionId, participant.user_id, participant.share_amount, participant.remark || null], (err) => {
        if (err) {
          console.error('Error inserting participant:', err);
        }
        insertParticipants();
      });
    };

    insertParticipants();
  });
});

router.put('/:id', authenticateUser, requireAdmin, (req, res) => {
  res.status(405).json({ 
    success: false, 
    error: '不允许修改，交易创建后不可更改' 
  });
});

router.patch('/:id', authenticateUser, requireAdmin, (req, res) => {
  res.status(405).json({ 
    success: false, 
    error: '不允许修改，交易创建后不可更改' 
  });
});

module.exports = router;