// App initialization and navigation
window.currentView = 'dashboard';
window.selectedCompanyId = null;

window.setupAppEventListeners = function() {
    // Taskbar navigation
    document.querySelectorAll('.taskbar-btn').forEach(btn => {
        btn.removeEventListener('click', btn._listener);
        
        const handler = () => {
            const view = btn.dataset.view;
            
            // TRÊN MOBILE: Nếu click vào tab "companies" và đang ở view companies
            if (window.innerWidth <= 768 && view === 'companies' && window.currentView === 'companies') {
                if (window.toggleCompanyList) {
                    window.toggleCompanyList();
                }
                return;
            }
            
            if (view && window.switchView) {
                window.switchView(view);
            }
        };
        
        btn._listener = handler;
        btn.addEventListener('click', handler);
    });
    
    // ========== NOTIFICATION BELL CLICK ==========
    const notificationBell = document.getElementById('notificationBell');
    if (notificationBell) {
        notificationBell.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openNotificationModal) {
                window.openNotificationModal();
            } else {
                console.warn('openNotificationModal not defined');
                window.showMessage('🔔 Tính năng thông báo đang được phát triển!');
            }
        });
    }
};

window.switchView = async function(view) {
    window.currentView = view;
    console.log('Switching to view:', view);
    
    // Update active button
    document.querySelectorAll('.taskbar-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        }
    });
    
    // Hide all views
    const views = ['dashboardView', 'companiesView', 'progressView', 'usersView'];
    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('hidden');
    });
    
    const selectedView = document.getElementById(`${view}View`);
    if (selectedView) selectedView.classList.remove('hidden');
    
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    
    switch(view) {
        case 'dashboard':
            if (isAdmin) {
                if (window.renderDashboard) await window.renderDashboard();
            } else {
                window.switchView('companies');
            }
            break;
        case 'companies':
            if (window.renderCompaniesView) await window.renderCompaniesView();
            break;
        case 'progress':
            if (window.renderProgressView) await window.renderProgressView();
            break;
        case 'users':
            if (isAdmin) {
                if (window.renderUsersView) await window.renderUsersView();
            } else {
                window.showMessage('🔒 Chỉ Quản lý mới xem được Nhân sự!');
                window.switchView('companies');
            }
            break;
        default:
            console.log('Unknown view:', view);
    }
};

// Hiển thị danh sách công ty
window.showCompanyList = function() {
    window.switchView('companies');
};

// Hiển thị danh sách công việc theo filter
window.showTaskListByFilter = function(filter) {
    let tasks = [];
    let title = '';
    
    switch(filter) {
        case 'all':
            tasks = window.tasksList;
            title = '📋 TẤT CẢ CÔNG VIỆC';
            break;
        case 'pending':
            tasks = window.tasksList.filter(t => t.status === 'pending');
            title = '⏳ CÔNG VIỆC CHỜ XỬ LÝ';
            break;
        case 'processing':
            tasks = window.tasksList.filter(t => t.status === 'processing');
            title = '🔄 CÔNG VIỆC ĐANG XỬ LÝ';
            break;
        case 'done':
            tasks = window.tasksList.filter(t => t.status === 'done');
            title = '✅ CÔNG VIỆC HOÀN THÀNH';
            break;
        case 'overdue':
            tasks = window.tasksList.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done');
            title = '⚠️ CÔNG VIỆC QUÁ HẠN';
            break;
        case 'upcoming':
            tasks = window.tasksList.filter(t => t.status !== 'done' && t.dueDate)
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            title = '📅 CÔNG VIỆC SẮP ĐẾN HẠN';
            break;
        default:
            tasks = window.tasksList;
            title = '📋 DANH SÁCH CÔNG VIỆC';
    }
    
    tasks.sort((a, b) => {
        const aOverdue = a.dueDate && new Date(a.dueDate) < new Date() && a.status !== 'done';
        const bOverdue = b.dueDate && new Date(b.dueDate) < new Date() && b.status !== 'done';
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        return (new Date(a.dueDate) || 0) - (new Date(b.dueDate) || 0);
    });
    
    if (tasks.length === 0) {
        window.showMessage(`📭 Không có công việc nào!`);
        return;
    }
    
    const modalHtml = `
        <div style="max-height: 500px; overflow-y: auto;">
            <div style="margin-bottom: 15px; padding: 10px; background: #f0f2f5; border-radius: 8px;">
                <strong>Tổng số: ${tasks.length} công việc</strong>
            </div>
            ${tasks.map(task => {
                const company = window.getCompanyById(task.companyId);
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
                const statusText = task.status === 'pending' ? 'Chờ' : task.status === 'processing' ? 'Đang xử lý' : 'Hoàn thành';
                const priorityIcon = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
                
                return `
                    <div class="task-item" style="cursor: pointer; margin-bottom: 10px;" onclick="window.closeModalAndViewTask('${task.id}')">
                        <div class="task-header">
                            <div>
                                <span class="task-title">${task.title}</span>
                                <span style="font-size: 11px; margin-left: 8px;">${priorityIcon} ${task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'Trung' : 'Thấp'}</span>
                            </div>
                            <span class="status-badge status-${task.status}">${statusText}</span>
                        </div>
                        <div class="task-meta">
                            <span><i class="fas fa-building"></i> ${company?.name || 'N/A'}</span>
                            <span><i class="fas fa-user"></i> ${task.assignedToName || 'Chưa phân công'}</span>
                            <span><i class="fas fa-calendar"></i> Hạn: ${window.formatDate(task.dueDate)}</span>
                            ${isOverdue ? '<span style="color: #f44336; font-weight: 500;">⚠️ QUÁ HẠN</span>' : ''}
                        </div>
                        <div style="margin-top: 8px; font-size: 11px; color: #666;">
                            <i class="fas fa-history"></i> Tạo: ${new Date(task.createdAt).toLocaleString()}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        <div style="margin-top: 20px; text-align: center;">
            <button class="btn btn-primary" onclick="window.closeTaskListModal()">Đóng</button>
        </div>
    `;
    
    document.getElementById('taskModalBody').innerHTML = modalHtml;
    document.getElementById('taskModalTitle').innerHTML = title;
    document.getElementById('taskModal').classList.remove('hidden');
};

window.closeTaskListModal = function() {
    document.getElementById('taskModal').classList.add('hidden');
};

window.closeModalAndViewTask = async function(taskId) {
    document.getElementById('taskModal').classList.add('hidden');
    await window.viewTaskDetail(taskId);
};

window.showTaskDetail = async function(taskId) {
    await window.viewTaskDetail(taskId);
};

// Khởi tạo khi trang load xong
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing app...');
    
    if (window.currentUser) {
        setTimeout(async () => {
            if (window.setupAppEventListeners) {
                window.setupAppEventListeners();
            }
            if (window.switchView) {
                window.switchView('dashboard');
            }
            
            // Tạo việc định kỳ cho tất cả công ty nếu chưa có
            if (window.currentUserRole === 'admin' && window.generateRecurringTasks) {
                await window.generateRecurringTasks();
            }
            
            // Khởi tạo thông báo
            if (window.loadUserNotifications) {
                await window.loadUserNotifications();
            }
        }, 500);
    }
});

// Đóng modal khi click outside
window.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
    }
});
// ========== FLOATING ACTION BUTTON - THÊM VIỆC NHANH ==========
const fabButton = document.getElementById('fabAddTask');
if (fabButton) {
    fabButton.addEventListener('click', () => {
        // Lấy công ty hiện tại đang chọn (nếu có)
        let currentCompanyId = window.selectedCompanyId || null;
        
        // Nếu đang ở tab companies và có công ty được chọn, truyền companyId vào
        if (window.currentView === 'companies' && currentCompanyId) {
            if (window.showAddTaskModal) {
                window.showAddTaskModal(currentCompanyId);
            } else {
                window.showMessage('Tính năng đang được phát triển!');
            }
        } else {
            // Nếu không có công ty nào được chọn, hiển thị modal thêm việc (có thể chọn công ty)
            if (window.showAddTaskModal) {
                window.showAddTaskModal();
            } else {
                window.showMessage('Tính năng đang được phát triển!');
            }
        }
    });
}
console.log('App module loaded!');