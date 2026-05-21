// Quản lý nhân sự (Chỉ Admin)

// Hiển thị danh sách nhân viên
window.renderUsersView = async function() {
    // Kiểm tra quyền Admin
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    
    if (!isAdmin) {
        window.showMessage('🔒 Bạn không có quyền truy cập mục này! Chỉ Admin mới được sử dụng.');
        setTimeout(() => {
            if (window.switchView) window.switchView('dashboard');
        }, 1500);
        return;
    }
    
    await window.loadUsers();
    await window.loadTasks();
    await window.loadCompanies();
    
    // Lọc theo tìm kiếm
    const searchTerm = document.getElementById('searchUser')?.value.toLowerCase() || '';
    let filteredUsers = window.usersList;
    if (searchTerm) {
        filteredUsers = filteredUsers.filter(u => 
            u.name?.toLowerCase().includes(searchTerm) || 
            u.email?.toLowerCase().includes(searchTerm)
        );
    }
    
    // Thống kê tổng thể
    const totalStaff = filteredUsers.filter(u => u.role === 'staff').length;
    const totalAdmin = filteredUsers.filter(u => u.role === 'admin').length;
    
    let usersHtml = '';
    for (const user of filteredUsers) {
        // Thống kê công việc của nhân viên
        const stats = window.getUserStats(user.uid);
        const percent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
        
        // Thống kê công ty/HKD phụ trách
        const companiesManaged = window.companiesList.filter(c => c.assignedTo === user.uid);
        const companiesCount = companiesManaged.length;
        const companiesList = companiesManaged.map(c => c.name).join(', ');
        
        // Xác định màu sắc theo role
        const roleColor = user.role === 'admin' ? '#ff9800' : '#667eea';
        const roleIcon = user.role === 'admin' ? '👑' : '👤';
        const roleText = user.role === 'admin' ? 'Admin' : 'Nhân viên';
        
        usersHtml += `
            <div class="user-card" data-user-id="${user.uid}">
                <div class="user-header">
                    <div class="user-avatar-large">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="user-info-large">
                        <div class="user-name">
                            ${user.name || user.email}
                            <span class="user-role" style="background: ${roleColor}">${roleIcon} ${roleText}</span>
                        </div>
                        <div class="user-email">${user.email}</div>
                        <div class="user-meta">
                            <span><i class="fas fa-calendar-alt"></i> Ngày tạo: ${new Date(user.createdAt).toLocaleDateString() || 'Chưa có'}</span>
                        </div>
                    </div>
                    <div class="user-actions">
                        ${user.uid !== window.currentUser?.uid ? `
                            <button class="btn btn-secondary btn-sm" onclick="window.showEditUserModal('${user.uid}')" title="Sửa thông tin">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="window.deleteUser('${user.uid}')" title="Xóa nhân viên">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : `
                            <button class="btn btn-secondary btn-sm" onclick="window.showEditUserModal('${user.uid}')" title="Sửa thông tin">
                                <i class="fas fa-edit"></i>
                            </button>
                            <span class="current-user-badge">Bạn</span>
                        `}
                    </div>
                </div>
                
                <div class="user-stats-grid">
                    <div class="user-stat-card">
                        <div class="user-stat-number">${stats.total}</div>
                        <div class="user-stat-label">📋 Tổng việc</div>
                    </div>
                    <div class="user-stat-card">
                        <div class="user-stat-number" style="color: #ff9800;">${stats.pending}</div>
                        <div class="user-stat-label">⏳ Chờ</div>
                    </div>
                    <div class="user-stat-card">
                        <div class="user-stat-number" style="color: #2196f3;">${stats.processing}</div>
                        <div class="user-stat-label">🔄 Đang xử lý</div>
                    </div>
                    <div class="user-stat-card">
                        <div class="user-stat-number" style="color: #4caf50;">${stats.done}</div>
                        <div class="user-stat-label">✅ Hoàn thành</div>
                    </div>
                    <div class="user-stat-card">
                        <div class="user-stat-number" style="color: #f44336;">${stats.overdue}</div>
                        <div class="user-stat-label">⚠️ Quá hạn</div>
                    </div>
                    <div class="user-stat-card">
                        <div class="user-stat-number" style="color: #9c27b0;">${companiesCount}</div>
                        <div class="user-stat-label">🏢 HKD/Cty phụ trách</div>
                    </div>
                </div>
                
                ${companiesCount > 0 ? `
                    <div class="user-companies">
                        <div class="user-companies-title">
                            <i class="fas fa-building"></i> Danh sách HKD/Công ty phụ trách (${companiesCount}):
                        </div>
                        <div class="user-companies-list">
                            ${companiesManaged.slice(0, 5).map(c => `
                                <span class="company-tag" onclick="window.viewCompanyFromUser('${c.id}')">${c.type === 'household' ? '🏪' : '🏭'} ${c.name}</span>
                            `).join('')}
                            ${companiesCount > 5 ? `<span class="company-tag more">+${companiesCount - 5} công ty</span>` : ''}
                        </div>
                    </div>
                ` : `
                    <div class="user-companies empty">
                        <i class="fas fa-building"></i> Chưa phụ trách công ty/HKD nào
                    </div>
                `}
                
                <div class="user-progress">
                    <div class="user-progress-label">
                        <span>Tiến độ công việc</span>
                        <span>${percent}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percent}%; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    const html = `
        <div class="users-stats">
            <div class="users-stats-card">
                <div class="users-stats-number">${window.usersList.filter(u => u.role === 'staff').length}</div>
                <div class="users-stats-label"><i class="fas fa-user"></i> Nhân viên</div>
            </div>
            <div class="users-stats-card">
                <div class="users-stats-number">${window.usersList.filter(u => u.role === 'admin').length}</div>
                <div class="users-stats-label"><i class="fas fa-user-shield"></i> Quản trị viên</div>
            </div>
            <div class="users-stats-card">
                <div class="users-stats-number">${window.tasksList.length}</div>
                <div class="users-stats-label"><i class="fas fa-tasks"></i> Tổng công việc</div>
            </div>
            <div class="users-stats-card">
                <div class="users-stats-number">${window.companiesList.length}</div>
                <div class="users-stats-label"><i class="fas fa-building"></i> HKD/Công ty</div>
            </div>
        </div>
        
        <div class="action-buttons">
            <button class="btn btn-primary" onclick="window.showAddUserModal()">
                <i class="fas fa-user-plus"></i> Thêm nhân viên
            </button>
            
            
        </div>
        
        <div class="card">
            <div class="card-title">
                <span><i class="fas fa-users"></i> Danh sách nhân viên</span>
                <span class="user-count">Tổng: ${filteredUsers.length} người</span>
            </div>
            <div class="users-list">
                ${usersHtml || '<div class="empty-state">Không tìm thấy nhân viên nào</div>'}
            </div>
        </div>
    `;
    
    const usersView = document.getElementById('usersView');
    if (usersView) usersView.innerHTML = html;
    
    // Gắn sự kiện tìm kiếm
    const searchInput = document.getElementById('searchUser');
    if (searchInput) {
        searchInput.addEventListener('input', () => window.renderUsersView());
    }
};

// Xem công ty từ nhân viên
window.viewCompanyFromUser = function(companyId) {
    window.switchView('companies');
    setTimeout(() => {
        if (window.selectCompany) window.selectCompany(companyId);
    }, 300);
};

// Thêm nhân viên mới
window.showAddUserModal = function() {
    const html = `
        <form id="addUserForm">
            <div class="form-group">
                <label><i class="fas fa-user"></i> Họ và tên *</label>
                <input type="text" name="name" required placeholder="Ví dụ: Nguyễn Văn A">
            </div>
            <div class="form-group">
                <label><i class="fas fa-envelope"></i> Email *</label>
                <input type="email" name="email" required placeholder="nhanvien@company.com">
            </div>
            <div class="form-group">
                <label><i class="fas fa-lock"></i> Mật khẩu *</label>
                <input type="password" name="password" required placeholder="Mật khẩu (tối thiểu 6 ký tự)">
            </div>
            <div class="form-group">
                <label><i class="fas fa-user-tag"></i> Vai trò</label>
                <select name="role">
                    <option value="staff">👤 Nhân viên</option>
                    <option value="admin">👑 Quản trị viên (Admin)</option>
                </select>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Tạo tài khoản</button>
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('entityModal').classList.add('hidden')"><i class="fas fa-times"></i> Hủy</button>
            </div>
        </form>
    `;
    
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Thêm nhân viên mới';
    document.getElementById('entityModal').classList.remove('hidden');
    
    document.getElementById('addUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        window.showLoading();
        
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const name = formData.get('name');
        const role = formData.get('role');
        
        try {
            // Tạo user trong Firebase Auth
            const userCredential = await window.firebaseCreateUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Lưu thông tin user vào Realtime Database
            const userRef = window.firebaseRef(window.firebaseDb, `users/${user.uid}`);
            await window.firebaseSet(userRef, {
                uid: user.uid,
                name: name,
                email: email,
                role: role,
                createdAt: new Date().toISOString()
            });
            
            window.hideLoading();
            document.getElementById('entityModal').classList.add('hidden');
            await window.loadUsers();
            await window.renderUsersView();
            window.showMessage(`✅ Đã thêm nhân viên "${name}" thành công!`);
        } catch (error) {
            window.hideLoading();
            let errorMsg = 'Lỗi khi tạo tài khoản!';
            if (error.code === 'auth/email-already-in-use') {
                errorMsg = 'Email này đã được sử dụng!';
            } else if (error.code === 'auth/weak-password') {
                errorMsg = 'Mật khẩu quá yếu! (tối thiểu 6 ký tự)';
            }
            window.showMessage(errorMsg);
        }
    });
};

// Sửa thông tin nhân viên
window.showEditUserModal = async function(userId) {
    const user = window.usersList.find(u => u.uid === userId);
    if (!user) return;
    
    const isCurrentUser = userId === window.currentUser?.uid;
    
    const html = `
        <form id="editUserForm">
            <div class="form-group">
                <label><i class="fas fa-user"></i> Họ và tên</label>
                <input type="text" name="name" value="${(user.name || '').replace(/"/g, '&quot;')}" required>
            </div>
            <div class="form-group">
                <label><i class="fas fa-envelope"></i> Email</label>
                <input type="email" name="email" value="${user.email}" required ${isCurrentUser ? 'readonly' : ''}>
                ${isCurrentUser ? '<small style="color: #999;">Không thể thay đổi email của chính mình</small>' : ''}
            </div>
            <div class="form-group">
                <label><i class="fas fa-user-tag"></i> Vai trò</label>
                <select name="role" ${isCurrentUser ? 'disabled' : ''}>
                    <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>👤 Nhân viên</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>👑 Quản trị viên (Admin)</option>
                </select>
                ${isCurrentUser ? '<small style="color: #999;">Không thể thay đổi role của chính mình</small>' : ''}
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Cập nhật</button>
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('entityModal').classList.add('hidden')"><i class="fas fa-times"></i> Hủy</button>
            </div>
        </form>
    `;
    
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Sửa thông tin nhân viên';
    document.getElementById('entityModal').classList.remove('hidden');
    
    document.getElementById('editUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        window.showLoading();
        
        const formData = new FormData(e.target);
        const updates = {
            name: formData.get('name'),
            updatedAt: new Date().toISOString()
        };
        
        if (!isCurrentUser) {
            updates.role = formData.get('role');
            if (formData.get('email') !== user.email) {
                updates.email = formData.get('email');
            }
        }
        
        const userRef = window.firebaseRef(window.firebaseDb, `users/${userId}`);
        await window.firebaseUpdate(userRef, updates);
        
        // Nếu là current user, cập nhật session
        if (isCurrentUser) {
            window.currentUserData.name = updates.name;
            sessionStorage.setItem('currentUser', JSON.stringify({
                uid: window.currentUser.uid,
                name: updates.name,
                email: window.currentUser.email,
                role: window.currentUserRole
            }));
            document.getElementById('userName').textContent = updates.name;
        }
        
        window.hideLoading();
        document.getElementById('entityModal').classList.add('hidden');
        await window.loadUsers();
        await window.renderUsersView();
        window.showMessage(`✅ Đã cập nhật thông tin nhân viên!`);
    });
};

// Xóa nhân viên
window.deleteUser = async function(userId) {
    const user = window.usersList.find(u => u.uid === userId);
    if (!user) return;
    
    // Kiểm tra xem user có đang phụ trách công ty nào không
    const managedCompanies = window.companiesList.filter(c => c.assignedTo === userId);
    const taskCount = window.getTasksByUser(userId).length;
    
    let confirmMsg = `Bạn có chắc muốn xóa nhân viên "${user.name || user.email}"?`;
    if (managedCompanies.length > 0) {
        confirmMsg += `\n\n⚠️ Nhân viên này đang phụ trách ${managedCompanies.length} công ty/HKD!`;
    }
    if (taskCount > 0) {
        confirmMsg += `\n⚠️ Nhân viên này có ${taskCount} công việc đang xử lý!`;
    }
    confirmMsg += `\n\nDữ liệu sẽ bị xóa vĩnh viễn!`;
    
    if (confirm(confirmMsg)) {
        window.showLoading();
        
        // Xóa user khỏi database
        const userRef = window.firebaseRef(window.firebaseDb, `users/${userId}`);
        await window.firebaseRemove(userRef);
        
        // Cập nhật lại các công ty (gán lại cho người khác hoặc bỏ trống)
        for (const company of managedCompanies) {
            const companyRef = window.firebaseRef(window.firebaseDb, `companies/${company.id}`);
            await window.firebaseUpdate(companyRef, {
                assignedTo: null,
                assignedToName: 'Chưa phân công',
                updatedAt: new Date().toISOString()
            });
        }
        
        window.hideLoading();
        await window.loadUsers();
        await window.loadCompanies();
        await window.renderUsersView();
        window.showMessage(`✅ Đã xóa nhân viên!`);
        
        // Refresh danh sách công ty nếu đang ở tab companies
        if (window.currentView === 'companies' && window.renderCompanyList) {
            window.renderCompanyList();
        }
    }
};

// Đổi role (giữ lại cho tương thích)
window.changeUserRole = async function(userId) {
    const user = window.usersList.find(u => u.uid === userId);
    if (user && userId !== window.currentUser?.uid) {
        const newRole = user.role === 'admin' ? 'staff' : 'admin';
        const userRef = window.firebaseRef(window.firebaseDb, `users/${userId}`);
        await window.firebaseUpdate(userRef, { role: newRole });
        await window.loadUsers();
        await window.renderUsersView();
        window.showMessage(`✅ Đã đổi role của ${user.name} thành ${newRole === 'admin' ? 'Admin' : 'Nhân viên'}`);
    } else {
        window.showMessage('Không thể đổi role của chính mình!');
    }
};

console.log('Users module with full features loaded!');