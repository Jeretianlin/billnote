const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_NAME || 'billnote.sqlite';
const db = new sqlite3.Database(path.join(__dirname, '../../', dbPath));

db.serialize(() => {
  db.run("PRAGMA journal_mode=WAL;");
});

function initializeDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')), 
        amount REAL NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        creator_user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_user_id) REFERENCES users(id)
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS transaction_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER,
        user_id INTEGER,
        share_amount REAL NOT NULL,
        remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS transaction_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER,
        user_id INTEGER,
        action TEXT CHECK (action IN ('create', 'view', 'deletion_request', 'deletion_approved')),
        old_values TEXT,
        new_values TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT
      );
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_creator ON transactions(creator_user_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_participants_user ON transaction_participants(user_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_participants_transaction ON transaction_participants(transaction_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);

    db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
      if (err) {
        console.error('Error checking users:', err);
      } else if (row.count === 0) {
        const bcrypt = require('bcryptjs');
        const defaultPassword = bcrypt.hashSync('123456', 10);
        
        const defaultUsers = [
          { name: '管理员', username: 'admin', role: 'admin', password: bcrypt.hashSync('admin123', 10) },
          { name: '张三', username: 'zhangsan', role: 'member', password: defaultPassword },
          { name: '李四', username: 'lisi', role: 'member', password: defaultPassword },
          { name: '王五', username: 'wangwu', role: 'member', password: defaultPassword },
          { name: '赵六', username: 'zhaoliu', role: 'member', password: defaultPassword },
          { name: '钱七', username: 'qianqi', role: 'member', password: defaultPassword },
          { name: '孙八', username: 'sunba', role: 'member', password: defaultPassword },
          { name: '周九', username: 'zhoujiu', role: 'member', password: defaultPassword },
          { name: '吴十', username: 'wushi', role: 'member', password: defaultPassword },
          { name: '郑十一', username: 'zhengshiyi', role: 'member', password: defaultPassword }
        ];
        
        const stmt = db.prepare(`
          INSERT INTO users (name, username, password_hash, role) 
          VALUES (?, ?, ?, ?)
        `);
        
        defaultUsers.forEach(user => {
          stmt.run(user.name, user.username, user.password, user.role, (err) => {
            if (err) {
              console.error('Error creating user:', user.name, err);
            }
          });
        });
        
        stmt.finalize(() => {
          console.log('默认用户已创建：');
          console.log('- 管理员: admin / admin123');
          console.log('- 其他用户: zhangsan, lisi, wangwu 等，密码均为 123456');
        });
      }
    });
  });
}

module.exports = { db, initializeDatabase };
