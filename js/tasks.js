// ========== TASKS MANAGEMENT WITH "LÀM NGAY" FEATURE ==========

// Xem chi tiết công việc (đầy đủ lịch sử)
window.viewTaskDetail = async function(taskId) {
    await window.loadUsers();
    await window.loadNotes();
    
    const task = window.tasksList.find(t => t.id === taskId);
    if (!task) return;
    
    const company = window.getCompanyById(task.companyId);
    const taskNotes = window.getNotesByTask(taskId);
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    
    const notesHtml = taskNotes.map(note => `
        <div class="note-item">
            <div class="note-header">
                <span><i class="fas fa-user"></i> ${note.createdByName || note.createdBy}</span>
                <span>${new Date(note.createdAt).toLocaleString()}</span>
            </div>
            <div class="note-content">${escapeHtml(note.content)}</div>
            ${isAdmin || note.createdBy === window.currentUser?.uid ? `
                <button class="btn-sm btn-danger" style="margin-top: 8px;" onclick="window.deleteNote('${taskId}', '${note.id}')">Xóa</button>
            ` : ''}
        </div>
    `).join('');
    
    // Lấy lịch sử task
    const history = task.history || [];
    const historyHtml = history.map(h => {
        let icon = '📝';
        if (h.action === 'created') icon = '✨';
        else if (h.action === 'started') icon = '▶️';
        else if (h.action === 'completed') icon = '✅';
        else if (h.action === 'supported') icon = '🤝';
        else if (h.action === 'note_added') icon = '💬';
        
        return `
            <div style="border-left: 3px solid #667eea; padding: 8px 12px; margin-bottom: 8px; background: #f8f9fa; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #666;">
                    <span><strong>${icon} ${h.title || h.action}</strong></span>
                    <span>${new Date(h.at || h.timestamp).toLocaleString()}</span>
                </div>
                <div style="font-size: 13px; margin-top: 4px;">${escapeHtml(h.description || h.details || '')}</div>
                <div style="font-size: 11px; color: #999; margin-top: 4px;">
                    <i class="fas fa-user"></i> ${h.byName || h.by || 'System'}
                </div>
            </div>
        `;
    }).join('');
    
    const html = `
        <div style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h4>📋 ${escapeHtml(task.title)}</h4>
                <span class="status-badge status-${task.status}">${window.getStatusText(task.status)}</span>
            </div>
            <div class="info-grid" style="margin-bottom: 16px;">
                <div class="info-item"><i class="fas fa-building"></i> Công ty: ${company?.name || 'N/A'}</div>
                <div class="info-item"><i class="fas fa-user-tie"></i> Người xử lý: ${task.assignedToName || 'Chưa phân công'}</div>
                <div class="info-item"><i class="fas fa-calendar"></i> Hạn: ${window.formatDate(task.dueDate)}</div>
                <div class="info-item"><i class="fas fa-clock"></i> Ngày tạo: ${new Date(task.createdAt).toLocaleString()}</div>
            </div>
            ${task.description ? `
                <div style="margin-bottom: 16px; padding: 12px; background: #f0f0f0; border-radius: 8px;">
                    <strong><i class="fas fa-align-left"></i> Mô tả:</strong>
                    <p style="margin-top: 6px;">${escapeHtml(task.description)}</p>
                </div>
            ` : ''}
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4><i class="fas fa-history"></i> Lịch sử xử lý</h4>
            <div style="max-height: 200px; overflow-y: auto;">
                ${historyHtml || '<div class="empty-state">Chưa có lịch sử</div>'}
            </div>
        </div>
        
        <div>
            <h4><i class="fas fa-comment-dots"></i> Ghi chú</h4>
            <div style="max-height: 250px; overflow-y: auto; margin-bottom: 12px;">
                ${notesHtml || '<div style="padding: 20px; text-align: center; color: #999;">Chưa có ghi chú nào</div>'}
            </div>
            <div class="form-group">
                <textarea id="newNoteContent" rows="3" style="width: 100%; padding: 10px;" placeholder="Nhập ghi chú mới..."></textarea>
            </div>
            <button class="btn btn-primary" onclick="window.addNoteToTask('${taskId}')"><i class="fas fa-paper-plane"></i> Gửi ghi chú</button>
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
            ${task.status !== 'done' ? `
                ${task.status !== 'processing' ? `
                    <button class="btn btn-secondary" onclick="window.startTaskFromModal('${taskId}')">
                        <i class="fas fa-play"></i> Bắt đầu xử lý
                    </button>
                ` : ''}
                <button class="btn btn-success" onclick="window.completeTaskFromModal('${taskId}')">
                    <i class="fas fa-check"></i> Hoàn thành
                </button>
            ` : ''}
            <button class="btn btn-outline" onclick="window.closeTaskDetailModal()">
                <i class="fas fa-times"></i> Đóng
            </button>
        </div>
    `;
    
    document.getElementById('taskModalBody').innerHTML = html;
    document.getElementById('taskModalTitle').innerHTML = '<i class="fas fa-info-circle"></i> Chi tiết công việc';
    document.getElementById('taskModal').classList.remove('hidden');
};

// Đóng modal chi tiết công việc
window.closeTaskDetailModal = function() {
    document.getElementById('taskModal').classList.add('hidden');
};

// Xem ghi chú công việc (alias cho viewTaskDetail)
window.viewTaskNotes = async function(taskId) {
    await window.viewTaskDetail(taskId);
};

// Thêm ghi chú
window.addNoteToTask = async function(taskId) {
    const content = document.getElementById('newNoteContent')?.value;
    if (!content) {
        window.showMessage('Vui lòng nhập nội dung ghi chú');
        return;
    }
    
    window.showLoading();
    
    const newNote = {
        taskId: taskId,
        content: content,
        createdBy: window.currentUser.uid,
        createdByName: window.currentUserData?.name,
        createdAt: new Date().toISOString()
    };
    
    const notesRef = window.firebaseRef(window.firebaseDb, 'notes');
    await window.firebasePush(notesRef, newNote);
    
    // Thêm vào lịch sử task
    const task = window.tasksList.find(t => t.id === taskId);
    const history = task.history || [];
    history.push({
        action: 'note_added',
        title: 'Thêm ghi chú',
        description: content.substring(0, 100),
        by: window.currentUser.uid,
        byName: window.currentUserData?.name,
        at: new Date().toISOString(),
        timestamp: new Date().toISOString()
    });
    
    const taskRef = window.firebaseRef(window.firebaseDb, `tasks/${taskId}`);
    await window.firebaseUpdate(taskRef, { history: history });
    
    window.hideLoading();
    window.viewTaskDetail(taskId);
    window.showMessage('Đã thêm ghi chú!');
};

// Xóa ghi chú
window.deleteNote = async function(taskId, noteId) {
    if (confirm('Bạn có chắc muốn xóa ghi chú này?')) {
        window.showLoading();
        const noteRef = window.firebaseRef(window.firebaseDb, `notes/${noteId}`);
        await window.firebaseRemove(noteRef);
        window.hideLoading();
        window.viewTaskDetail(taskId);
        window.showMessage('Đã xóa ghi chú!');
    }
};

// Hoàn thành task từ modal
window.completeTaskFromModal = async function(taskId) {
    await window.updateTaskStatus(taskId, 'done');
    window.closeTaskDetailModal();
    if (window.currentView === 'companies' && window.selectedCompanyId) {
        if (window.renderCompanyDetail) await window.renderCompanyDetail(window.selectedCompanyId);
        if (window.renderCompanyList) window.renderCompanyList();
    } else if (window.currentView === 'progress') {
        if (window.renderProgressView) await window.renderProgressView();
    } else if (window.currentView === 'dashboard') {
        if (window.renderDashboard) await window.renderDashboard();
    }
};

// Bắt đầu task từ modal
window.startTaskFromModal = async function(taskId) {
    await window.updateTaskStatus(taskId, 'processing');
    window.closeTaskDetailModal();
    if (window.currentView === 'companies' && window.selectedCompanyId) {
        if (window.renderCompanyDetail) await window.renderCompanyDetail(window.selectedCompanyId);
        if (window.renderCompanyList) window.renderCompanyList();
    } else if (window.currentView === 'progress') {
        if (window.renderProgressView) await window.renderProgressView();
    } else if (window.currentView === 'dashboard') {
        if (window.renderDashboard) await window.renderDashboard();
    }
};

// Xóa task
window.deleteTask = async function(taskId) {
    if (!confirm('⚠️ Bạn có chắc muốn xóa công việc này?\n\nHành động này không thể hoàn tác!')) {
        return;
    }
    
    window.showLoading();
    
    try {
        const taskRef = window.firebaseRef(window.firebaseDb, `tasks/${taskId}`);
        await window.firebaseRemove(taskRef);
        
        const notesToDelete = window.notesList.filter(n => n.taskId === taskId);
        for (const note of notesToDelete) {
            const noteRef = window.firebaseRef(window.firebaseDb, `notes/${note.id}`);
            await window.firebaseRemove(noteRef);
        }
        
        await window.loadAllData();
        
        if (window.currentView === 'companies' && window.selectedCompanyId) {
            if (window.renderCompanyDetail) await window.renderCompanyDetail(window.selectedCompanyId);
            if (window.renderCompanyList) window.renderCompanyList();
        } else if (window.currentView === 'progress') {
            if (window.renderProgressView) await window.renderProgressView();
        } else if (window.currentView === 'dashboard') {
            if (window.renderDashboard) await window.renderDashboard();
        }
        
        if (window.updateBadges) await window.updateBadges();
        window.showMessage('✅ Đã xóa công việc!');
    } catch (error) {
        console.error('Error deleting task:', error);
        window.showMessage('❌ Lỗi khi xóa công việc!');
    }
    
    window.hideLoading();
};

// Cập nhật trạng thái công việc
window.updateTaskStatus = async function(taskId, status) {
    window.showLoading();
    
    const task = window.tasksList.find(t => t.id === taskId);
    if (!task) {
        window.hideLoading();
        return;
    }
    
    const now = new Date().toISOString();
    const history = task.history || [];
    const updates = { status: status, updatedAt: now };
    
    if (status === 'processing' && task.status !== 'processing') {
        history.push({
            action: 'started',
            title: 'Bắt đầu xử lý',
            description: `${window.currentUserData?.name} đã bắt đầu xử lý công việc`,
            by: window.currentUser.uid,
            byName: window.currentUserData?.name,
            at: now,
            timestamp: now
        });
        updates.startedAt = now;
        updates.isUrgent = false;
    } else if (status === 'done' && task.status !== 'done') {
        history.push({
            action: 'completed',
            title: 'Hoàn thành',
            description: `${window.currentUserData?.name} đã hoàn thành công việc`,
            by: window.currentUser.uid,
            byName: window.currentUserData?.name,
            at: now,
            timestamp: now
        });
        updates.completedAt = now;
        updates.completedBy = window.currentUser.uid;
        updates.completedByName = window.currentUserData?.name;
        
        if (task.startedAt) {
            const start = new Date(task.startedAt);
            const end = new Date(now);
            updates.processingTime = Math.floor((end - start) / 1000);
        }
    }
    
    updates.history = history;
    
    const taskRef = window.firebaseRef(window.firebaseDb, `tasks/${taskId}`);
    await window.firebaseUpdate(taskRef, updates);
    
    window.hideLoading();
    await window.loadTasks();
    
    if (window.currentView === 'companies' && window.selectedCompanyId) {
        if (window.renderCompanyDetail) await window.renderCompanyDetail(window.selectedCompanyId);
    } else if (window.currentView === 'progress') {
        if (window.renderProgressView) await window.renderProgressView();
    } else if (window.currentView === 'dashboard') {
        if (window.renderDashboard) await window.renderDashboard();
    }
    if (window.updateBadges) await window.updateBadges();
    
    window.showMessage(`Đã cập nhật trạng thái thành "${window.getStatusText(status)}"`);
};

// Thêm công việc mới
window.showAddTaskModal = function(companyId = null) {
    window.loadCompanies();
    window.loadUsers();
    
    const html = `
        <form id="addTaskForm">
            <div class="form-group">
                <label>Tên công việc *</label>
                <input type="text" name="title" required placeholder="Ví dụ: Kiểm tra giấy phép...">
            </div>
            <div class="form-group">
                <label>Công ty/HKD</label>
                <select name="companyId">
                    ${window.companiesList.map(c => `<option value="${c.id}" ${companyId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Người xử lý</label>
                <select name="assignedTo">
                    <option value="">Chưa phân công</option>
                    ${window.usersList.filter(u => u.role === 'staff').map(u => `<option value="${u.uid}" ${u.uid === window.currentUser?.uid ? 'selected' : ''}>${escapeHtml(u.name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Độ ưu tiên</label>
                <select name="priority">
                    <option value="low">🟢 Thấp</option>
                    <option value="medium">🟡 Trung</option>
                    <option value="high" selected>🔴 Cao</option>
                </select>
            </div>
            <div class="form-group">
                <label>Hạn xử lý</label>
                <input type="date" name="dueDate">
            </div>
            <div class="form-group">
                <label>Mô tả (optional)</label>
                <textarea name="description" rows="2" placeholder="Nhập mô tả chi tiết..."></textarea>
            </div>
            <div class="form-group urgent-note">
                <i class="fas fa-bolt"></i> <strong>Công việc này sẽ được đánh dấu <span style="color:#f44336;">🔥 LÀM NGAY</span> và hiển thị ưu tiên hàng đầu</strong>
            </div>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Tạo công việc</button>
        </form>
    `;
    
    document.getElementById('taskModalBody').innerHTML = html;
    document.getElementById('taskModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Thêm công việc mới';
    document.getElementById('taskModal').classList.remove('hidden');
    
    document.getElementById('addTaskForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        window.showLoading();
        
        const formData = new FormData(e.target);
        const assignedTo = formData.get('assignedTo');
        const assignedUser = window.usersList.find(u => u.uid === assignedTo);
        const now = new Date().toISOString();
        
        const newTask = {
            title: formData.get('title'),
            companyId: formData.get('companyId'),
            description: formData.get('description') || '',
            assignedTo: assignedTo || null,
            assignedToName: assignedUser?.name || 'Chưa phân công',
            priority: formData.get('priority'),
            dueDate: formData.get('dueDate'),
            status: 'pending',
            isUrgent: true,
            isSupport: false,
            createdBy: window.currentUser.uid,
            createdByName: window.currentUserData?.name,
            createdAt: now,
            updatedAt: now,
            history: [{
                action: 'created',
                title: 'Tạo công việc',
                description: `Công việc "${formData.get('title')}" được tạo (🔥 Làm ngay)`,
                by: window.currentUser.uid,
                byName: window.currentUserData?.name,
                at: now,
                timestamp: now
            }]
        };
        
        const tasksRef = window.firebaseRef(window.firebaseDb, 'tasks');
        await window.firebasePush(tasksRef, newTask);
        
        window.hideLoading();
        window.closeTaskDetailModal();
        
        await window.loadAllData();
        
        if (window.currentView === 'companies' && window.selectedCompanyId) {
            if (window.renderCompanyDetail) await window.renderCompanyDetail(window.selectedCompanyId);
            if (window.renderCompanyList) window.renderCompanyList();
        } else if (window.currentView === 'progress') {
            if (window.renderProgressView) await window.renderProgressView();
        } else if (window.currentView === 'dashboard') {
            if (window.renderDashboard) await window.renderDashboard();
        }
        if (window.updateBadges) await window.updateBadges();
        window.showMessage('Thêm công việc thành công!');
    });
};

// Hàm thoát HTML
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

console.log('Tasks module with viewTaskDetail loaded!');

// ========== TASK ACTIONS FOR STAFF ==========

// Hoàn thành task (gọi từ nút "Hoàn thành" trong detail)
window.completeTask = async function(taskId) {
    if (!confirm('✅ Xác nhận hoàn thành công việc này?')) return;
    
    window.showLoading();
    
    const task = window.tasksList.find(t => t.id === taskId);
    if (!task) {
        window.hideLoading();
        window.showMessage('Không tìm thấy công việc!');
        return;
    }
    
    const now = new Date().toISOString();
    const history = task.history || [];
    
    history.push({
        action: 'completed',
        title: 'Hoàn thành',
        description: `${window.currentUserData?.name} đã hoàn thành công việc`,
        by: window.currentUser.uid,
        byName: window.currentUserData?.name,
        at: now,
        timestamp: now
    });
    
    const updates = {
        status: 'done',
        completedAt: now,
        completedBy: window.currentUser.uid,
        completedByName: window.currentUserData?.name,
        history: history,
        updatedAt: now
    };
    
    if (task.startedAt) {
        const start = new Date(task.startedAt);
        const end = new Date(now);
        updates.processingTime = Math.floor((end - start) / 1000);
    }
    
    const taskRef = window.firebaseRef(window.firebaseDb, `tasks/${taskId}`);
    await window.firebaseUpdate(taskRef, updates);
    
    await window.loadTasks();
    window.hideLoading();
    
    // Refresh UI
    if (window.currentView === 'companies' && window.selectedCompanyId) {
        if (window.renderCompanyDetail) await window.renderCompanyDetail(window.selectedCompanyId);
        if (window.renderCompanyList) window.renderCompanyList();
    } else if (window.currentView === 'progress') {
        if (window.renderProgressView) await window.renderProgressView();
    } else if (window.currentView === 'dashboard') {
        if (window.renderDashboard) await window.renderDashboard();
    }
    
    if (window.updateBadges) await window.updateBadges();
    window.showMessage('✅ Đã hoàn thành công việc!');
    
    // Đóng modal nếu đang mở
    if (window.closeTaskDetailModal) window.closeTaskDetailModal();
};

// Bắt đầu task (gọi từ nút "Bắt đầu" trong detail)
window.startTask = async function(taskId) {
    if (!confirm('▶️ Xác nhận bắt đầu xử lý công việc này?')) return;
    
    window.showLoading();
    
    const task = window.tasksList.find(t => t.id === taskId);
    if (!task) {
        window.hideLoading();
        window.showMessage('Không tìm thấy công việc!');
        return;
    }
    
    const now = new Date().toISOString();
    const history = task.history || [];
    
    history.push({
        action: 'started',
        title: 'Bắt đầu xử lý',
        description: `${window.currentUserData?.name} đã bắt đầu xử lý công việc`,
        by: window.currentUser.uid,
        byName: window.currentUserData?.name,
        at: now,
        timestamp: now
    });
    
    const updates = {
        status: 'processing',
        startedAt: now,
        isUrgent: false,
        history: history,
        updatedAt: now
    };
    
    const taskRef = window.firebaseRef(window.firebaseDb, `tasks/${taskId}`);
    await window.firebaseUpdate(taskRef, updates);
    
    await window.loadTasks();
    window.hideLoading();
    
    // Refresh UI
    if (window.currentView === 'companies' && window.selectedCompanyId) {
        if (window.renderCompanyDetail) await window.renderCompanyDetail(window.selectedCompanyId);
        if (window.renderCompanyList) window.renderCompanyList();
    } else if (window.currentView === 'progress') {
        if (window.renderProgressView) await window.renderProgressView();
    } else if (window.currentView === 'dashboard') {
        if (window.renderDashboard) await window.renderDashboard();
    }
    
    window.showMessage('▶️ Đã bắt đầu xử lý công việc!');
    
    // Đóng modal nếu đang mở
    if (window.closeTaskDetailModal) window.closeTaskDetailModal();
};

// Xóa task (đã có, giữ nguyên)
// window.deleteTask = async function(taskId) { ... }

console.log('Tasks module with completeTask and startTask loaded!');