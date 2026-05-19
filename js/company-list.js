// ========== DANH SÁCH CÔNG TY/HKD (SIDEBAR) ==========
window.selectedCompanyId = null;

// Hàm tính số ngày còn lại
function getDaysLeft(dueDate) {
    if (!dueDate) return 999;
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate); 
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

// Đếm số lượng công ty theo nhân viên
function getStaffCompanyStats() {
    const stats = {};
    
    for (const company of window.companiesList) {
        const staffName = company.assignedToName || 'Chưa phân công';
        if (!stats[staffName]) {
            stats[staffName] = {
                total: 0,
                companies: []
            };
        }
        stats[staffName].total++;
        stats[staffName].companies.push(company);
    }
    
    return stats;
}

// Render bộ lọc nhân viên kèm số lượng
function renderStaffFilter() {
    const staffStats = getStaffCompanyStats();
    const filterSelect = document.getElementById('filterStaff');
    if (!filterSelect) return;
    
    let options = '<option value="all">👥 Tất cả nhân viên</option>';
    
    const sortedStaff = Object.keys(staffStats).sort();
    
    for (const staffName of sortedStaff) {
        const count = staffStats[staffName].total;
        options += `<option value="${staffName}">👤 ${staffName} (${count} công ty)</option>`;
    }
    
    filterSelect.innerHTML = options;
}

// Lấy thông tin công ty (bao gồm việc khẩn cấp)
function getCompanyDisplayInfo(companyId) {
    const stats = window.getCompanyStats(companyId);
    const tasks = window.getTasksByCompany(companyId);
    
    // Tìm công việc khẩn cấp (làm ngay) chưa hoàn thành
    const urgentTasks = tasks.filter(t => t.isUrgent === true && t.status !== 'done');
    const hasUrgent = urgentTasks.length > 0;
    
    // Tìm công việc sắp đến hạn nhất
    let nearestDueDate = null;
    let nearestTask = null;
    
    for (const task of tasks) {
        if (task.status !== 'done' && task.dueDate) {
            const dueDate = new Date(task.dueDate);
            if (!nearestDueDate || dueDate < nearestDueDate) {
                nearestDueDate = dueDate;
                nearestTask = task;
            }
        }
    }
    
    // Tính cảnh báo
    let warningText = '';
    let warningClass = '';
    if (hasUrgent) {
        warningText = `🔥 ${urgentTasks.length} việc LÀM NGAY`;
        warningClass = 'urgent-warning';
    } else if (nearestTask && nearestTask.dueDate) {
        const daysLeft = getDaysLeft(nearestTask.dueDate);
        if (daysLeft < 0) {
            warningText = `🔴 Quá hạn ${Math.abs(daysLeft)} ngày`;
            warningClass = 'overdue-warning';
        } else if (daysLeft <= 7) {
            warningText = `⚠️ Còn ${daysLeft} ngày`;
            warningClass = 'upcoming-warning';
        }
    }
    
    // Tính % hoàn thành cho nhân viên
    let staffProgress = '';
    if (stats.total > 0) {
        const percent = Math.round((stats.done / stats.total) * 100);
        staffProgress = `${stats.done}/${stats.total} (${percent}%)`;
    } else {
        staffProgress = 'Chưa có việc';
    }
    
    return {
        stats,
        warningText,
        warningClass,
        staffProgress,
        nearestTask,
        hasUrgent,
        urgentCount: urgentTasks.length
    };
}

// Render danh sách công ty
window.renderCompanyList = function() {
    if (!window.companiesList) return;
    
    const searchTerm = document.getElementById('searchCompany')?.value.toLowerCase() || '';
    const staffFilter = document.getElementById('filterStaff')?.value || 'all';
    
    let filtered = window.companiesList.filter(c => c.name.toLowerCase().includes(searchTerm));
    
    if (staffFilter !== 'all') {
        filtered = filtered.filter(c => (c.assignedToName || 'Chưa phân công') === staffFilter);
    }
    
    const container = document.getElementById('companyList');
    if (!container) return;
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">🏢 Không có công ty nào</div>';
        return;
    }
    
    container.innerHTML = filtered.map(company => {
        const info = getCompanyDisplayInfo(company.id);
        const stats = info.stats;
        const badgeClass = company.type === 'household' ? 'badge-hkd' : 'badge-company';
        const badgeText = company.type === 'household' ? 'HKD' : 'CTY';
        const isActive = window.selectedCompanyId === company.id;
        
        // Xác định trạng thái tổng thể
        let statusColor = '';
        let statusIcon = '';
        let statusText = '';
        if (info.hasUrgent) {
            statusColor = '#f44336';
            statusIcon = '🔥';
            statusText = 'Có việc khẩn!';
        } else if (stats.overdue > 0) {
            statusColor = '#f44336';
            statusIcon = '🔴';
            statusText = 'Quá hạn';
        } else if (stats.pending > 0) {
            statusColor = '#ff9800';
            statusIcon = '⚠️';
            statusText = 'Cần xử lý';
        } else {
            statusColor = '#4caf50';
            statusIcon = '✅';
            statusText = 'Tốt';
        }
        
        return `
            <div class="company-card ${isActive ? 'active' : ''} ${info.hasUrgent ? 'has-urgent' : ''}" data-company-id="${company.id}" onclick="window.selectCompany('${company.id}')">
                <!-- Hàng 1: Tên công ty + Loại hình + Trạng thái -->
                <div class="company-header">
                    <div class="company-name-section">
                        <span class="company-name">${company.type === 'household' ? '🏪' : '🏭'} ${escapeHtml(company.name)}</span>
                        <span class="company-badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="company-status" style="color: ${statusColor};">
                        ${statusIcon} ${statusText}
                    </div>
                </div>
                
                <!-- Hàng 2: Nhân viên phụ trách + Tiến độ -->
                <div class="company-info">
                    <div class="info-line">
                        <i class="fas fa-user"></i> <strong>${escapeHtml(company.assignedToName) || 'Chưa phân công'}</strong>
                        <span class="staff-progress">📊 ${info.staffProgress}</span>
                    </div>
                </div>
                
                <!-- Hàng 3: Thống kê nhanh -->
                <div class="company-stats-row">
                    <div class="stat-cell">
                        <span class="stat-number">${stats.total}</span>
                        <span class="stat-label">📋 Tổng</span>
                    </div>
                    <div class="stat-cell">
                        <span class="stat-number ${stats.pending > 0 ? 'warning' : ''}">${stats.pending}</span>
                        <span class="stat-label">⏳ Chờ</span>
                    </div>
                    <div class="stat-cell">
                        <span class="stat-number">${stats.processing}</span>
                        <span class="stat-label">🔄 Đang</span>
                    </div>
                    <div class="stat-cell">
                        <span class="stat-number done">${stats.done}</span>
                        <span class="stat-label">✅ Xong</span>
                    </div>
                    <div class="stat-cell">
                        <span class="stat-number ${stats.overdue > 0 ? 'overdue' : ''}">${stats.overdue}</span>
                        <span class="stat-label">⚠️ Quá</span>
                    </div>
                </div>
                
                <!-- Hàng 4: Cảnh báo (ưu tiên hiển thị việc khẩn trước) -->
                ${info.warningText ? `
                    <div class="company-warning ${info.warningClass}">
                        <i class="fas ${info.hasUrgent ? 'fa-bolt' : 'fa-bell'}"></i> 
                        ${info.warningText}
                        ${info.hasUrgent && info.urgentCount > 0 ? 
                            `<span class="urgent-task-count">🔥 ${info.urgentCount} việc cần xử lý ngay</span>` : 
                            (info.nearestTask ? `<span class="task-name">📌 ${escapeHtml(info.nearestTask.title.substring(0, 25))}${info.nearestTask.title.length > 25 ? '...' : ''}</span>` : '')
                        }
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
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

// Hàm chọn công ty
window.selectCompany = function(companyId) {
    console.log('selectCompany called:', companyId);
    window.selectedCompanyId = companyId;
    window.renderCompanyList();
    if (window.renderCompanyDetail) {
        window.renderCompanyDetail(companyId);
    }
};

// Render toàn bộ view companies
window.renderCompaniesView = async function() {
    console.log('renderCompaniesView called');
    
    await window.loadCompanies();
    await window.loadUsers();
    
    const canAddCompany = window.currentUser != null;
    
    const html = `
    <div class="two-columns">
        <!-- Sidebar trái: Danh sách công ty -->
        <div class="company-list-panel">
            <div class="close-sidebar-btn" onclick="window.closeCompanyList()">
                <i class="fas fa-times"></i> Đóng
            </div>
            <div class="card">
                <div class="card-title">
                    <span><i class="fas fa-list"></i> Danh sách HKD/Công ty</span>
                    ${canAddCompany ? '<button class="btn btn-primary btn-sm" onclick="window.showAddCompanyModal()"><i class="fas fa-plus"></i> Thêm</button>' : ''}
                </div>
                <div class="search-box">
                    <input type="text" id="searchCompany" placeholder="🔍 Tìm kiếm công ty/HKD...">
                </div>
                <div class="filter-group">
                    <select class="filter-select" id="filterStaff">
                        <option value="all">👥 Đang tải...</option>
                    </select>
                </div>
                <div class="company-items" id="companyList"></div>
            </div>
        </div>
        
        <!-- Chi tiết công ty bên phải -->
        <div class="company-detail-panel" id="companyDetailPanel">
            <div class="empty-state">
                <i class="fas fa-building" style="font-size: 48px;"></i>
                <p>🏢 Chọn một công ty/HKD để xem chi tiết</p>
            </div>
        </div>
    </div>
`;
    
    const companiesView = document.getElementById('companiesView');
    if (companiesView) companiesView.innerHTML = html;
    
    renderStaffFilter();
    
    const searchInput = document.getElementById('searchCompany');
    const staffFilter = document.getElementById('filterStaff');
    
    if (searchInput) searchInput.addEventListener('input', () => window.renderCompanyList());
    if (staffFilter) staffFilter.addEventListener('change', () => window.renderCompanyList());
    
    window.renderCompanyList();
    
    if (window.companiesList.length > 0 && !window.selectedCompanyId) {
        window.selectCompany(window.companiesList[0].id);
    } else if (window.selectedCompanyId && window.renderCompanyDetail) {
        await window.renderCompanyDetail(window.selectedCompanyId);
    }
};

console.log('Company list module loaded!');
// ========== MOBILE FUNCTIONS ==========
// Biến lưu trạng thái danh sách có đang mở không
let isCompanyListOpen = false;

// Mở danh sách công ty trên mobile
window.openCompanyList = function() {
    const sidebar = document.querySelector('.company-list-panel');
    if (sidebar) {
        sidebar.classList.add('open');
        isCompanyListOpen = true;
    }
};

// Đóng danh sách công ty trên mobile
window.closeCompanyList = function() {
    const sidebar = document.querySelector('.company-list-panel');
    if (sidebar) {
        sidebar.classList.remove('open');
        isCompanyListOpen = false;
    }
};

// Toggle danh sách công ty (gọi khi click vào tab)
window.toggleCompanyList = function() {
    if (isCompanyListOpen) {
        window.closeCompanyList();
    } else {
        window.openCompanyList();
    }
};

// Đóng sidebar khi chọn công ty (trên mobile)
const originalSelectCompany = window.selectCompany;
window.selectCompany = function(companyId) {
    console.log('selectCompany called:', companyId);
    window.selectedCompanyId = companyId;
    window.renderCompanyList();
    if (window.renderCompanyDetail) {
        window.renderCompanyDetail(companyId);
    }
    // Trên mobile, tự động đóng sidebar sau khi chọn công ty
    if (window.innerWidth <= 768) {
        window.closeCompanyList();
    }
};

// Quay lại danh sách (từ chi tiết công ty)
window.backToCompanyList = function() {
    window.openCompanyList();
    // Cuộn lên đầu trang detail
    const detailPanel = document.querySelector('.company-detail-panel');
    if (detailPanel) {
        detailPanel.scrollTop = 0;
    }
};

console.log('Mobile functions loaded!');


console.log('Mobile functions loaded!');