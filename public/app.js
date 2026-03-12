// 全局状态
let currentUser = null;
let allUsers = [];

// DOM元素
const elements = {
    loginScreen: document.getElementById('login-screen'),
    dashboardScreen: document.getElementById('dashboard-screen'),
    addTransactionScreen: document.getElementById('add-transaction-screen'),
    viewTransactionsScreen: document.getElementById('view-transactions-screen'),
    usersScreen: document.getElementById('users-screen'),
    profileScreen: document.getElementById('profile-screen'),
    loginForm: document.getElementById('login-form'),
    logoutBtn: document.getElementById('logout-btn'),
    showAddTransaction: document.getElementById('show-add-transaction'),
    showUsers: document.getElementById('show-users'),
    showProfile: document.getElementById('show-profile'),
    backToDashboard: document.getElementById('back-to-dashboard'),
    backToDashboard2: document.getElementById('back-to-dashboard-2'),
    backToDashboard3: document.getElementById('back-to-dashboard-3'),
    backToDashboard4: document.getElementById('back-to-dashboard-4'),
    viewAllTransactions: document.getElementById('view-all-transactions'),
    addTransactionForm: document.getElementById('add-transaction-form'),
    addParticipantBtn: document.getElementById('add-participant-btn'),
    selectAllParticipantsBtn: document.getElementById('select-all-participants-btn'),
    participantsContainer: document.getElementById('participants-container'),
    userName: document.getElementById('user-name'),
    totalIncome: document.getElementById('total-income'),
    totalExpense: document.getElementById('total-expense'),
    netBalance: document.getElementById('net-balance'),
    recentTransactions: document.getElementById('recent-transactions'),
    allTransactions: document.getElementById('all-transactions'),
    allUsersContainer: document.getElementById('all-users'),
    loginError: document.getElementById('login-error'),
    transactionError: document.getElementById('transaction-error'),
    profileForm: document.getElementById('profile-form'),
    passwordForm: document.getElementById('password-form'),
    profileError: document.getElementById('profile-error'),
    profileSuccess: document.getElementById('profile-success'),
    userBalancesScreen: document.getElementById('user-balances-screen'),
    showUserBalances: document.getElementById('show-user-balances'),
    backToDashboard5: document.getElementById('back-to-dashboard-5'),
    userBalancesContainer: document.getElementById('user-balances-container'),
    balanceUserFilter: document.getElementById('balance-user-filter'),
    balanceStartDate: document.getElementById('balance-start-date'),
    balanceEndDate: document.getElementById('balance-end-date'),
    refreshBalances: document.getElementById('refresh-balances'),
    exportBalances: document.getElementById('export-balances'),
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transaction-date').value = today;

    loadUsers();

    elements.loginForm.addEventListener('submit', handleLogin);
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.showAddTransaction?.addEventListener('click', showAddTransactionScreen);
    elements.showUsers?.addEventListener('click', showUsersScreen);
    elements.showProfile?.addEventListener('click', showProfileScreen);
    elements.backToDashboard?.addEventListener('click', showDashboardScreen);
    elements.backToDashboard2?.addEventListener('click', showDashboardScreen);
    elements.backToDashboard3?.addEventListener('click', showDashboardScreen);
    elements.backToDashboard4?.addEventListener('click', showDashboardScreen);
    elements.backToDashboard5?.addEventListener('click', showDashboardScreen);
    elements.viewAllTransactions?.addEventListener('click', showViewTransactionsScreen);
    elements.showUserBalances?.addEventListener('click', showUserBalancesScreen);
    elements.refreshBalances?.addEventListener('click', loadUserBalancesData);
    elements.exportBalances?.addEventListener('click', exportUserBalances);
    elements.addTransactionForm.addEventListener('submit', handleAddTransaction);
    elements.addParticipantBtn?.addEventListener('click', addParticipantInput);
    elements.selectAllParticipantsBtn?.addEventListener('click', selectAllParticipants);
    elements.profileForm?.addEventListener('submit', handleProfileUpdate);
    elements.passwordForm?.addEventListener('submit', handlePasswordChange);
    
    // 监听金额输入，自动更新分摊金额
    document.getElementById('transaction-amount').addEventListener('input', updateParticipantShares);

    const token = localStorage.getItem('token');
    if (token) {
        verifyTokenAndLoadDashboard();
    }
});

async function verifyTokenAndLoadDashboard() {
    try {
        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const result = await response.json();
            currentUser = result.user;
            showDashboardScreen();
            updateUserInfo();
            loadUserBalance();
            loadRecentTransactions();
        } else {
            localStorage.removeItem('token');
            showLoginScreen();
        }
    } catch (error) {
        console.error('验证token错误:', error);
        localStorage.removeItem('token');
        showLoginScreen();
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(elements.loginForm);
    const loginData = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        });

        const result = await response.json();

        if (result.success) {
            localStorage.setItem('token', result.token);
            currentUser = result.user;
            elements.loginError.style.display = 'none';
            showDashboardScreen();
            updateUserInfo();
            loadUserBalance();
            loadRecentTransactions();
        } else {
            elements.loginError.textContent = result.error || '登录失败';
            elements.loginError.style.display = 'block';
        }
    } catch (error) {
        console.error('登录错误:', error);
        elements.loginError.textContent = '登录过程中发生错误';
        elements.loginError.style.display = 'block';
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    currentUser = null;
    showLoginScreen();
}

function updateUserInfo() {
    if (currentUser) {
        elements.userName.textContent = currentUser.name;
        const adminControls = document.getElementById('admin-controls');
        if (currentUser.role === 'admin') {
            adminControls.style.display = 'block';
        } else {
            adminControls.style.display = 'none';
        }
    }
}

function showLoginScreen() {
    elements.loginScreen.classList.add('active');
    elements.dashboardScreen.classList.remove('active');
    elements.addTransactionScreen.classList.remove('active');
    elements.viewTransactionsScreen.classList.remove('active');
    elements.usersScreen.classList.remove('active');
    elements.profileScreen?.classList.remove('active');
}

function showDashboardScreen() {
    elements.loginScreen.classList.remove('active');
    elements.dashboardScreen.classList.add('active');
    elements.addTransactionScreen.classList.remove('active');
    elements.viewTransactionsScreen.classList.remove('active');
    elements.usersScreen.classList.remove('active');
    elements.profileScreen?.classList.remove('active');
    loadUserBalance();
    loadRecentTransactions();
}

async function showAddTransactionScreen() {
    elements.loginScreen.classList.remove('active');
    elements.dashboardScreen.classList.remove('active');
    elements.addTransactionScreen.classList.add('active');
    elements.viewTransactionsScreen.classList.remove('active');
    elements.usersScreen.classList.remove('active');
    elements.profileScreen?.classList.remove('active');
    
    elements.addTransactionForm.reset();
    document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
    elements.participantsContainer.innerHTML = '';
    
    // 先加载用户列表，再选择全部参与者
    await loadUsers();
    selectAllParticipants();
}

function showViewTransactionsScreen() {
    elements.loginScreen.classList.remove('active');
    elements.dashboardScreen.classList.remove('active');
    elements.addTransactionScreen.classList.remove('active');
    elements.viewTransactionsScreen.classList.add('active');
    elements.usersScreen.classList.remove('active');
    elements.profileScreen?.classList.remove('active');
    loadAllTransactions();
}

function showUsersScreen() {
    elements.loginScreen.classList.remove('active');
    elements.dashboardScreen.classList.remove('active');
    elements.addTransactionScreen.classList.remove('active');
    elements.viewTransactionsScreen.classList.remove('active');
    elements.usersScreen.classList.add('active');
    elements.profileScreen?.classList.remove('active');
    loadAllUsers();
}

function showProfileScreen() {
    elements.loginScreen.classList.remove('active');
    elements.dashboardScreen.classList.remove('active');
    elements.addTransactionScreen.classList.remove('active');
    elements.viewTransactionsScreen.classList.remove('active');
    elements.usersScreen.classList.remove('active');
    elements.profileScreen?.classList.add('active');
    
    document.getElementById('profile-name').value = currentUser.name;
    document.getElementById('profile-username').value = currentUser.username;
    elements.profileError.style.display = 'none';
    elements.profileSuccess.style.display = 'none';
}

function showUserBalancesScreen() {
    elements.loginScreen.classList.remove('active');
    elements.dashboardScreen.classList.remove('active');
    elements.addTransactionScreen.classList.remove('active');
    elements.viewTransactionsScreen.classList.remove('active');
    elements.usersScreen.classList.remove('active');
    elements.profileScreen?.classList.remove('active');
    elements.userBalancesScreen?.classList.add('active');
    
    const today = new Date().toISOString().split('T')[0];
    elements.balanceStartDate.value = '';
    elements.balanceEndDate.value = today;
    
    populateBalanceUserFilter();
    loadUserBalancesData();
}

async function loadUserBalance() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/users/${currentUser.id}/balance`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const result = await response.json();
            const balance = result.data || { total_income: 0, total_expense: 0, net_balance: 0 };
            
            // 根据是否是全局统计更新标题
            const balanceTitle = document.getElementById('balance-title');
            if (balance.is_global) {
                balanceTitle.textContent = '全局统计';
            } else {
                balanceTitle.textContent = '我的余额';
            }
            
            elements.totalIncome.textContent = `¥${balance.total_income.toFixed(2)}`;
            elements.totalExpense.textContent = `¥${balance.total_expense.toFixed(2)}`;
            elements.netBalance.textContent = `¥${balance.net_balance.toFixed(2)}`;
            
            elements.netBalance.style.color = balance.net_balance >= 0 ? '#27ae60' : '#e74c3c';
        }
    } catch (error) {
        console.error('加载余额错误:', error);
    }
}

async function loadRecentTransactions() {
    if (!currentUser) return;
    
    try {
        // admin用户查看全部最近交易
        if (currentUser.role === 'admin') {
            const response = await fetch('/api/transactions?page=1&limit=5', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const result = await response.json();
                const transactions = result.data || [];
                
                if (transactions.length === 0) {
                    elements.recentTransactions.innerHTML = '<p>暂无交易记录</p>';
                    return;
                }
                
                elements.recentTransactions.innerHTML = transactions.map(tx => `
                    <div class="transaction-item">
                        <div class="transaction-details">
                            <div>
                                <span class="transaction-type-${tx.type}">${tx.type === 'income' ? '收入' : '支出'}</span>
                                - ${tx.description}
                            </div>
                            <div class="transaction-participants">
                                金额：${tx.type === 'income' ? '+' : '-'}¥${tx.amount.toFixed(2)} | 日期：${new Date(tx.date).toLocaleDateString('zh-CN')}
                            </div>
                        </div>
                        <div class="transaction-amount">
                            ${tx.type === 'income' ? '+' : '-'}¥${tx.amount.toFixed(2)}
                        </div>
                    </div>
                `).join('');
            }
            return;
        }
        
        // 普通用户查看自己的交易
        const response = await fetch(`/api/users/${currentUser.id}/transactions?page=1&limit=5`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const result = await response.json();
            const transactions = result.data || [];
            
            if (transactions.length === 0) {
                elements.recentTransactions.innerHTML = '<p>暂无交易记录</p>';
                return;
            }
            
            elements.recentTransactions.innerHTML = transactions.map(tx => `
                <div class="transaction-item">
                    <div class="transaction-details">
                        <div>
                            <span class="transaction-type-${tx.type}">${tx.type === 'income' ? '收入' : '支出'}</span>
                            - ${tx.description}${tx.remark ? ` (${tx.remark})` : ''}
                        </div>
                        <div class="transaction-participants">
                            金额：${tx.type === 'income' ? '+' : '-'}¥${tx.share_amount.toFixed(2)} | 日期：${new Date(tx.date).toLocaleDateString('zh-CN')}
                        </div>
                    </div>
                    <div class="transaction-amount">
                        ${tx.type === 'income' ? '+' : '-'}¥${tx.share_amount.toFixed(2)}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('加载最近交易错误:', error);
        elements.recentTransactions.innerHTML = '<p>加载交易记录出错</p>';
    }
}

async function loadAllTransactions() {
    try {
        const response = await fetch('/api/transactions?page=1&limit=20', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const result = await response.json();
            const transactions = result.data || [];
            
            if (transactions.length === 0) {
                elements.allTransactions.innerHTML = '<p>暂无交易记录</p>';
                return;
            }
            
            elements.allTransactions.innerHTML = transactions.map(tx => `
                <div class="transaction-detail">
                    <div class="transaction-header">
                        <div>
                            <h4>${tx.description}</h4>
                            <p><strong>类型：</strong> <span class="transaction-type-${tx.type}">${tx.type === 'income' ? '收入' : '支出'}</span> | 
                               <strong>金额：</strong> ${tx.type === 'income' ? '+' : '-'}¥${tx.amount.toFixed(2)} | 
                               <strong>日期：</strong> ${new Date(tx.date).toLocaleDateString('zh-CN')} | 
                               <strong>创建人：</strong> ${tx.creator_name}</p>
                        </div>
                    </div>
                    <div>
                        <p><strong>参与者：</strong></p>
                        <div class="transaction-participants-list">
                            ${tx.participants.map(p => `
                                <span class="participant-badge ${p.status === 'inactive' ? 'participant-inactive' : ''}">
                                    ${p.name}${p.status === 'inactive' ? '（已禁用）' : ''}: ${tx.type === 'income' ? '+' : '-'}¥${p.share_amount.toFixed(2)}${p.remark ? ` (${p.remark})` : ''}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('加载全部交易错误:', error);
        elements.allTransactions.innerHTML = '<p>加载交易记录出错</p>';
    }
}

async function loadAllUsers() {
    try {
        const response = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const result = await response.json();
            const users = result.data || [];
            
            if (users.length === 0) {
                elements.allUsersContainer.innerHTML = '<p>暂无用户</p>';
                return;
            }
            
            elements.allUsersContainer.innerHTML = users.map(user => `
                <div class="user-card">
                    <div class="user-card-header">
                        <div>
                            <h4>ID: ${user.id} - ${user.name}</h4>
                            <span class="status-badge ${user.status === 'active' ? 'status-active' : 'status-inactive'}">
                                ${user.status === 'active' ? '✓ 有效' : '✗ 无效'}
                            </span>
                        </div>
                    </div>
                    <div class="user-card-body">
                        <p><strong>用户名：</strong> ${user.username}</p>
                        <p><strong>角色：</strong> ${user.role === 'admin' ? '管理员' : '成员'}</p>
                        <p><strong>加入日期：</strong> ${new Date(user.join_date).toLocaleDateString('zh-CN')}</p>
                    </div>
                    <div class="user-card-actions">
                        <button class="btn-secondary" onclick="openEditUserModal(${user.id}, '${user.name}', '${user.username}', '${user.role}')">编辑</button>
                        <button class="btn-secondary" onclick="openResetPasswordModal(${user.id}, '${user.name}')">重置密码</button>
                        ${user.role !== 'admin' ? `
                            <button class="${user.status === 'active' ? 'btn-danger' : 'btn-success'}" 
                                    onclick="toggleUserStatus(${user.id}, '${user.status === 'active' ? 'inactive' : 'active'}')">
                                ${user.status === 'active' ? '禁用' : '启用'}
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('加载用户错误:', error);
        elements.allUsersContainer.innerHTML = '<p>加载用户出错</p>';
    }
}

async function loadUsers() {
    try {
        const response = await fetch('/api/users/list', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const result = await response.json();
            allUsers = result.data || [];
        }
    } catch (error) {
        console.error('加载用户列表错误:', error);
    }
}

function addParticipantInput(selectedUserId = null, shareAmount = null, remark = null) {
    const participantDiv = document.createElement('div');
    participantDiv.className = 'participant-inputs';
    
    participantDiv.innerHTML = `
        <select class="participant-user" required>
            <option value="">选择用户</option>
            ${allUsers.map(user => `<option value="${user.id}" ${selectedUserId === user.id ? 'selected' : ''}>${user.name}</option>`).join('')}
        </select>
        <input type="number" class="participant-share" placeholder="分摊金额" step="0.01" min="0.01" value="${shareAmount || ''}" required>
        <input type="text" class="participant-remark" placeholder="备注" maxlength="50" value="${remark || ''}">
        <button type="button" class="remove-participant">×</button>
    `;
    
    elements.participantsContainer.appendChild(participantDiv);
    
    participantDiv.querySelector('.remove-participant').addEventListener('click', function() {
        participantDiv.remove();
        updateParticipantShares();
    });
    
    // 添加参与者后自动更新分摊金额
    updateParticipantShares();
}

function selectAllParticipants() {
    elements.participantsContainer.innerHTML = '';
    
    if (allUsers.length === 0) {
        return;
    }
    
    const totalAmount = parseFloat(document.getElementById('transaction-amount').value) || 0;
    const shareAmount = allUsers.length > 0 ? (totalAmount / allUsers.length).toFixed(2) : 0;
    
    // 临时移除addParticipantInput中的updateParticipantShares调用
    allUsers.forEach(user => {
        const participantDiv = document.createElement('div');
        participantDiv.className = 'participant-inputs';
        
        participantDiv.innerHTML = `
            <select class="participant-user" required>
                <option value="">选择用户</option>
                ${allUsers.map(u => `<option value="${u.id}" ${user.id === u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
            </select>
            <input type="number" class="participant-share" placeholder="分摊金额" step="0.01" min="0.01" value="${shareAmount}" required>
            <input type="text" class="participant-remark" placeholder="备注" maxlength="50" value="">
            <button type="button" class="remove-participant">×</button>
        `;
        
        elements.participantsContainer.appendChild(participantDiv);
        
        participantDiv.querySelector('.remove-participant').addEventListener('click', function() {
            participantDiv.remove();
            updateParticipantShares();
        });
    });
}

function updateParticipantShares() {
    const totalAmount = parseFloat(document.getElementById('transaction-amount').value) || 0;
    const participantInputs = elements.participantsContainer.querySelectorAll('.participant-inputs');
    const count = participantInputs.length;
    
    if (count > 0) {
        const shareAmount = (totalAmount / count).toFixed(2);
        participantInputs.forEach(input => {
            input.querySelector('.participant-share').value = shareAmount;
        });
    }
}

async function handleAddTransaction(event) {
    event.preventDefault();
    
    const formData = new FormData(elements.addTransactionForm);
    const transactionData = {
        type: formData.get('type'),
        amount: parseFloat(formData.get('amount')),
        description: formData.get('description'),
        date: formData.get('date'),
        participants: []
    };
    
    const participantInputs = elements.participantsContainer.querySelectorAll('.participant-inputs');
    for (const input of participantInputs) {
        const userId = input.querySelector('.participant-user').value;
        const shareAmount = parseFloat(input.querySelector('.participant-share').value);
        const remark = input.querySelector('.participant-remark').value;
        
        if (userId && shareAmount) {
            transactionData.participants.push({
                user_id: parseInt(userId),
                share_amount: shareAmount,
                remark: remark || null
            });
        }
    }
    
    if (transactionData.participants.length === 0) {
        elements.transactionError.textContent = '至少需要一个参与者';
        elements.transactionError.style.display = 'block';
        return;
    }
    
    if (transactionData.type === 'expense') {
        const totalShares = transactionData.participants.reduce((sum, p) => sum + p.share_amount, 0);
        if (Math.abs(totalShares - transactionData.amount) > 0.01) {
            elements.transactionError.textContent = '参与者分摊金额之和必须等于交易总金额';
            elements.transactionError.style.display = 'block';
            return;
        }
    }
    
    try {
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(transactionData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            elements.transactionError.style.display = 'none';
            alert('交易添加成功！');
            showDashboardScreen();
            loadUserBalance();
            loadRecentTransactions();
        } else {
            elements.transactionError.textContent = result.error || '添加交易失败';
            elements.transactionError.style.display = 'block';
        }
    } catch (error) {
        console.error('添加交易错误:', error);
        elements.transactionError.textContent = '添加交易过程中发生错误';
        elements.transactionError.style.display = 'block';
    }
}

async function handleProfileUpdate(event) {
    event.preventDefault();
    
    const formData = new FormData(elements.profileForm);
    const updateData = {
        name: formData.get('name'),
        username: formData.get('username')
    };
    
    try {
        const response = await fetch(`/api/users/${currentUser.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentUser = result.user;
            elements.profileSuccess.textContent = '个人信息修改成功！';
            elements.profileSuccess.style.display = 'block';
            elements.profileError.style.display = 'none';
            updateUserInfo();
        } else {
            elements.profileError.textContent = result.error || '修改失败';
            elements.profileError.style.display = 'block';
            elements.profileSuccess.style.display = 'none';
        }
    } catch (error) {
        console.error('修改个人信息错误:', error);
        elements.profileError.textContent = '修改过程中发生错误';
        elements.profileError.style.display = 'block';
    }
}

async function handlePasswordChange(event) {
    event.preventDefault();
    
    const formData = new FormData(elements.passwordForm);
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');
    
    if (newPassword !== confirmPassword) {
        elements.profileError.textContent = '两次输入的新密码不一致';
        elements.profileError.style.display = 'block';
        return;
    }
    
    const updateData = {
        currentPassword: formData.get('currentPassword'),
        newPassword: newPassword
    };
    
    try {
        const response = await fetch(`/api/users/${currentUser.id}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            elements.profileSuccess.textContent = '密码修改成功！';
            elements.profileSuccess.style.display = 'block';
            elements.profileError.style.display = 'none';
            elements.passwordForm.reset();
        } else {
            elements.profileError.textContent = result.error || '修改密码失败';
            elements.profileError.style.display = 'block';
            elements.profileSuccess.style.display = 'none';
        }
    } catch (error) {
        console.error('修改密码错误:', error);
        elements.profileError.textContent = '修改密码过程中发生错误';
        elements.profileError.style.display = 'block';
    }
}

// 模态框相关函数
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

// 打开新增用户模态框
function openAddUserModal() {
    document.getElementById('add-user-form').reset();
    document.getElementById('add-user-error').style.display = 'none';
    openModal('add-user-modal');
}

// 打开编辑用户模态框
function openEditUserModal(userId, name, username, role) {
    document.getElementById('edit-user-id').value = userId;
    document.getElementById('edit-user-id-display').value = userId;
    document.getElementById('edit-user-name').value = name;
    document.getElementById('edit-user-username').value = username;
    document.getElementById('edit-user-role').value = role === 'admin' ? '管理员' : '成员';
    document.getElementById('edit-user-error').style.display = 'none';
    openModal('edit-user-modal');
}

// 打开重置密码模态框
function openResetPasswordModal(userId, userName) {
    document.getElementById('reset-password-user-id').value = userId;
    document.getElementById('reset-password-user-name').value = userName;
    document.getElementById('reset-password-form').reset();
    document.getElementById('reset-password-error').style.display = 'none';
    openModal('reset-password-modal');
}

// 切换用户状态
async function toggleUserStatus(userId, newStatus) {
    const actionText = newStatus === 'active' ? '启用' : '禁用';
    if (!confirm(`确定要${actionText}该用户吗？`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/users/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            loadAllUsers();
            loadUsers();
        } else {
            alert(result.error || '操作失败');
        }
    } catch (error) {
        console.error('切换用户状态错误:', error);
        alert('操作过程中发生错误');
    }
}

// 处理新增用户
async function handleAddUser(event) {
    event.preventDefault();
    
    const formData = new FormData(document.getElementById('add-user-form'));
    const userData = {
        name: formData.get('name'),
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('add-user-modal');
            alert('用户创建成功！');
            loadAllUsers();
            loadUsers();
        } else {
            document.getElementById('add-user-error').textContent = result.error || '创建失败';
            document.getElementById('add-user-error').style.display = 'block';
        }
    } catch (error) {
        console.error('创建用户错误:', error);
        document.getElementById('add-user-error').textContent = '创建过程中发生错误';
        document.getElementById('add-user-error').style.display = 'block';
    }
}

// 处理编辑用户
async function handleEditUser(event) {
    event.preventDefault();
    
    const formData = new FormData(document.getElementById('edit-user-form'));
    const userId = formData.get('id');
    const userData = {
        name: formData.get('name'),
        username: formData.get('username')
    };
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('edit-user-modal');
            alert('用户信息修改成功！');
            loadAllUsers();
            loadUsers();
        } else {
            document.getElementById('edit-user-error').textContent = result.error || '修改失败';
            document.getElementById('edit-user-error').style.display = 'block';
        }
    } catch (error) {
        console.error('修改用户错误:', error);
        document.getElementById('edit-user-error').textContent = '修改过程中发生错误';
        document.getElementById('edit-user-error').style.display = 'block';
    }
}

// 处理重置密码
async function handleResetPassword(event) {
    event.preventDefault();
    
    const formData = new FormData(document.getElementById('reset-password-form'));
    const userId = formData.get('id');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');
    
    if (newPassword !== confirmPassword) {
        document.getElementById('reset-password-error').textContent = '两次输入的密码不一致';
        document.getElementById('reset-password-error').style.display = 'block';
        return;
    }
    
    try {
        const response = await fetch(`/api/users/${userId}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ newPassword })
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('reset-password-modal');
            alert('密码重置成功！');
        } else {
            document.getElementById('reset-password-error').textContent = result.error || '重置失败';
            document.getElementById('reset-password-error').style.display = 'block';
        }
    } catch (error) {
        console.error('重置密码错误:', error);
        document.getElementById('reset-password-error').textContent = '重置过程中发生错误';
        document.getElementById('reset-password-error').style.display = 'block';
    }
}

// 添加事件监听器
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('add-user-btn')?.addEventListener('click', openAddUserModal);
    document.getElementById('add-user-form')?.addEventListener('submit', handleAddUser);
    document.getElementById('edit-user-form')?.addEventListener('submit', handleEditUser);
    document.getElementById('reset-password-form')?.addEventListener('submit', handleResetPassword);
    
    // 点击模态框外部关闭
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
});

async function populateBalanceUserFilter() {
    try {
        const response = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const users = result.data || [];
            const nonAdminUsers = users.filter(u => u.role !== 'admin');
            
            elements.balanceUserFilter.innerHTML = '<option value="">全部用户</option>' +
                nonAdminUsers.map(user => `<option value="${user.id}">${user.name}</option>`).join('');
        }
    } catch (error) {
        console.error('加载用户列表错误:', error);
    }
}

async function loadUserBalancesData() {
    try {
        const userId = elements.balanceUserFilter?.value || '';
        const startDate = elements.balanceStartDate?.value || '';
        const endDate = elements.balanceEndDate?.value || '';
        
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const url = `/api/users/balances${params.toString() ? '?' + params.toString() : ''}`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const result = await response.json();
            const balances = result.data || [];
            
            if (balances.length === 0) {
                elements.userBalancesContainer.innerHTML = '<p>暂无数据</p>';
                return;
            }
            
            elements.userBalancesContainer.innerHTML = balances.map(user => `
                <div class="user-card">
                    <div class="user-card-header">
                        <h4>${user.name}</h4>
                        <span class="status-badge ${user.status === 'active' ? 'status-active' : 'status-inactive'}">
                            ${user.status === 'active' ? '✓ 有效' : '✗ 无效'}
                        </span>
                    </div>
                    <div class="user-card-body">
                        <p><strong>总收入：</strong> <span style="color: #27ae60;">¥${user.total_income.toFixed(2)}</span></p>
                        <p><strong>总支出：</strong> <span style="color: #e74c3c;">¥${user.total_expense.toFixed(2)}</span></p>
                        <p><strong>净余额：</strong> <span style="color: ${user.net_balance >= 0 ? '#27ae60' : '#e74c3c'}; font-weight: bold;">¥${user.net_balance.toFixed(2)}</span></p>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('加载用户余额错误:', error);
        elements.userBalancesContainer.innerHTML = '<p>加载出错</p>';
    }
}

async function exportUserBalances() {
    const userId = elements.balanceUserFilter?.value || '';
    const startDate = elements.balanceStartDate?.value || '';
    const endDate = elements.balanceEndDate?.value || '';
    
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const url = `/api/users/balances/export${params.toString() ? '?' + params.toString() : ''}`;
    
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `user-balances-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } else {
            alert('导出失败');
        }
    } catch (error) {
        console.error('导出错误:', error);
        alert('导出过程中发生错误');
    }
}