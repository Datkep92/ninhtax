// ========== DANH SÁCH CÔNG TY/HKD (SIDEBAR) ==========
window.selectedCompanyId = null;
window.showQuickTagSelector = function(companyId, event) {
    if (event) event.stopPropagation();
    
    const company = window.companiesList.find(c => c.id === companyId);
    if (!company) return;
    
    const availableTags = window.availableTags || [];
    const currentTags = window.companyTags[companyId] || [];
    const currentTagIds = currentTags.map(t => t.id);
    
    const tagsHtml = availableTags.map(tag => `
        <label class="tag-option" style="display: flex; align-items: center; gap: 8px; padding: 10px; cursor: pointer; border-bottom: 1px solid #f0f0f0;">
            <input type="checkbox" value="${tag.id}" ${currentTagIds.includes(tag.id) ? 'checked' : ''}>
            <span class="tag-badge" style="background: ${tag.color}20; color: ${tag.color}; padding: 4px 10px; border-radius: 20px; font-size: 12px;">
                <i class="fas ${tag.icon || 'fa-tag'}"></i> ${tag.name}
            </span>
        </label>
    `).join('');
    
    const modalHtml = `
        <div style="max-height: 400px; overflow-y: auto;">
            <div style="margin-bottom: 15px; padding: 10px; background: #f0f2f5; border-radius: 8px;">
                <strong>🏷️ Gán thẻ cho: ${escapeHtml(company.name)}</strong>
            </div>
            <div id="quickTagList">
                ${tagsHtml || '<div class="empty-state">Chưa có thẻ nào. Hãy tạo thẻ trong phần Nhân sự.</div>'}
            </div>
        </div>
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
            <button class="btn btn-primary" onclick="saveQuickTags('${companyId}')">Lưu thẻ</button>
            <button class="btn btn-secondary" onclick="window.closeTaskListModal()">Hủy</button>
        </div>
    `;
    
    document.getElementById('taskModalBody').innerHTML = modalHtml;
    document.getElementById('taskModalTitle').innerHTML = `🏷️ Gán thẻ - ${escapeHtml(company.name)}`;
    document.getElementById('taskModal').classList.remove('hidden');
    
    window._tempCompanyIdForTags = companyId;
};

// Hàm tính số ngày còn lại
function getDaysLeft(dueDate) {
    if (!dueDate) return 999;
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate); 
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

// Hàm xác định mức độ ưu tiên của công ty (để sắp xếp)
function getCompanyPriority(company) {
    const stats = window.getCompanyStats(company.id);
    const tasks = window.getTasksByCompany(company.id);
    
    const hasUrgent = tasks.some(t => t.isUrgent === true && t.status !== 'done');
    if (hasUrgent) return 1;
    if (stats.overdue > 0) return 2;
    if (stats.pending > 0) return 3;
    return 4;
}

// Đếm số lượng công ty theo nhân viên
function getStaffCompanyStats() {
    const stats = {};
    for (const company of window.companiesList) {
        const staffName = company.assignedToName || 'Chưa phân công';
        if (!stats[staffName]) {
            stats[staffName] = { total: 0, companies: [] };
        }
        stats[staffName].total++;
        stats[staffName].companies.push(company);
    }
    return stats;
}

// Render bộ lọc nhân viên
function renderStaffFilter() {
    const staffStats = getStaffCompanyStats();
    const filterSelect = document.getElementById('filterStaff');
    if (!filterSelect) return;
    
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    const currentUserName = window.currentUserData?.name || window.currentUser?.email;
    
    let options = '<option value="all">👥 Tất cả nhân viên</option>';
    const sortedStaff = Object.keys(staffStats).sort();
    
    if (!isAdmin) {
        options = `<option value="${currentUserName}" selected>👤 Của tôi (${staffStats[currentUserName]?.total || 0})</option>`;
        options += '<option value="all">👥 Tất cả nhân viên</option>';
    }
    
    for (const staffName of sortedStaff) {
        if (!isAdmin && staffName === currentUserName) continue;
        options += `<option value="${staffName}">👤 ${staffName} (${staffStats[staffName]?.total || 0})</option>`;
    }
    
    filterSelect.innerHTML = options;
    if (!isAdmin) filterSelect.value = currentUserName;
}

// Render bộ lọc thẻ
function renderTagFilter() {
    const tagFilter = document.getElementById('filterTag');
    if (!tagFilter || !window.availableTags) return;
    
    let options = '<option value="all">🏷️ Tất cả thẻ</option>';
    for (const tag of window.availableTags) {
        options += `<option value="${tag.id}">${tag.name}</option>`;
    }
    tagFilter.innerHTML = options;
}

// Lấy thông tin công ty
function getCompanyDisplayInfo(companyId) {
    const stats = window.getCompanyStats(companyId);
    const tasks = window.getTasksByCompany(companyId);
    
    const urgentTasks = tasks.filter(t => t.isUrgent === true && t.status !== 'done');
    const hasUrgent = urgentTasks.length > 0;
    
    let nearestTask = null;
    let nearestDays = null;
    for (const task of tasks) {
        if (task.status !== 'done' && task.dueDate) {
            const daysLeft = getDaysLeft(task.dueDate);
            if (nearestDays === null || daysLeft < nearestDays) {
                nearestDays = daysLeft;
                nearestTask = task;
            }
        }
    }
    
    let warningText = '', warningClass = '';
    if (hasUrgent) {
        warningText = `🔥 ${urgentTasks.length} việc LÀM NGAY`;
        warningClass = 'urgent-warning';
    } else if (nearestTask && nearestDays < 0) {
        warningText = `🔴 Quá hạn ${Math.abs(nearestDays)} ngày`;
        warningClass = 'overdue-warning';
    } else if (nearestTask && nearestDays <= 7) {
        warningText = `⚠️ Còn ${nearestDays} ngày`;
        warningClass = 'upcoming-warning';
    }
    
    let staffProgress = '';
    if (stats.total > 0) {
        const percent = Math.round((stats.done / stats.total) * 100);
        staffProgress = `${stats.done}/${stats.total} (${percent}%)`;
    } else {
        staffProgress = 'Chưa có việc';
    }
    
    return { stats, warningText, warningClass, staffProgress, nearestTask, hasUrgent, urgentCount: urgentTasks.length };
}

// ========== TỰ ĐỘNG GÁN THẺ TỪ CÔNG VIỆC LẶP LẠI ==========
window.autoAssignTagsFromTasks = async function(companyId) {
    const tasks = window.getTasksByCompany(companyId);
    const recurringTasks = tasks.filter(t => t.isRecurring === true);
    const currentPeriod = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    
    const tagMapping = {
        'vat_monthly': 'tax_declaration',
        'vat_quarterly': 'tax_declaration',
        'tax_quarterly': 'tax_declaration',
        'financial_yearly': 'financial_report',
        'bhxh_monthly': 'insurance',
        'bhxh_hkd': 'insurance',
        'tndn_quarterly': 'tax_finalization'
    };
    
    const tagIdsToAdd = new Set();
    
    for (const task of recurringTasks) {
        const isCompleted = (task.history || []).some(h => 
            (h.action === 'completed' || h.action === 'skipped') && h.period === currentPeriod
        );
        
        if (isCompleted && tagMapping[task.templateId]) {
            tagIdsToAdd.add(tagMapping[task.templateId]);
        }
    }
    
    // Lấy thông tin thẻ đầy đủ
    const tagsToAdd = window.availableTags.filter(tag => tagIdsToAdd.has(tag.id));
    
    if (tagsToAdd.length > 0) {
        const currentTags = window.companyTags[companyId] || [];
        const mergedTags = [...currentTags];
        
        for (const tag of tagsToAdd) {
            if (!mergedTags.some(t => t.id === tag.id)) {
                mergedTags.push(tag);
            }
        }
        
        if (mergedTags.length !== currentTags.length) {
            await window.saveCompanyTags(companyId, mergedTags);
            return true; // Đã cập nhật
        }
    }
    return false; // Không thay đổi
};

// ========== GÁN THẺ THỦ CÔNG ==========
window.manualAssignTagToCompany = async function(companyId, tagId) {
    const tag = window.availableTags.find(t => t.id === tagId);
    if (!tag) return false;
    
    const currentTags = window.companyTags[companyId] || [];
    if (!currentTags.some(t => t.id === tagId)) {
        currentTags.push(tag);
        await window.saveCompanyTags(companyId, currentTags);
        
        // Refresh UI
        window.renderCompanyList();
        if (window.selectedCompanyId === companyId && window.renderCompanyDetail) {
            await window.renderCompanyDetail(companyId);
        }
        window.showMessage(`✅ Đã gán thẻ "${tag.name}" cho công ty!`);
        return true;
    }
    return false;
};

// Xóa thẻ khỏi card (CÓ LƯU LỊCH SỬ)
window.removeTagFromCompanyCard = async function(companyId, tagId, event) {
    if (event) event.stopPropagation();
    
    const currentTags = window.companyTags?.[companyId] || [];
    const removedTag = currentTags.find(t => t?.id === tagId);
    const newTags = currentTags.filter(t => t?.id !== tagId);
    
    // Lấy lịch sử hiện tại
    let tagHistory = [];
    if (window.companyTagHistory && window.companyTagHistory[companyId]) {
        tagHistory = window.companyTagHistory[companyId];
    } else {
        tagHistory = [];
        if (!window.companyTagHistory) window.companyTagHistory = {};
    }
    
    // Ghi nhận xóa thẻ
    tagHistory.push({
        tagId: tagId,
        tagName: removedTag?.name || '',
        tagColor: removedTag?.color || '',
        action: 'removed',
        by: window.currentUser.uid,
        byName: window.currentUserData?.name || window.currentUser?.email,
        at: new Date().toISOString()
    });
    
    // Lưu tags
    if (window.saveCompanyTags) {
        await window.saveCompanyTags(companyId, newTags);
    }
    
    // Lưu lịch sử
    if (window.saveCompanyTagHistory) {
        await window.saveCompanyTagHistory(companyId, tagHistory);
    } else {
        window.companyTagHistory[companyId] = tagHistory;
    }
    
    window.renderCompanyList();
    if (window.selectedCompanyId === companyId && window.renderCompanyDetail) {
        await window.renderCompanyDetail(companyId);
    }
    window.showMessage('✅ Đã xóa thẻ!');
};

// Render danh sách công ty
window.renderCompanyList = function() {
    if (!window.companiesList) return;
    
    const searchTerm = document.getElementById('searchCompany')?.value.toLowerCase() || '';
    const staffFilter = document.getElementById('filterStaff')?.value || 'all';
    const tagFilter = document.getElementById('filterTag')?.value || 'all';
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    const currentUserName = window.currentUserData?.name || window.currentUser?.email;
    const currentPeriod = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    
    let filtered = window.companiesList.filter(c => c.name.toLowerCase().includes(searchTerm));
    
    if (staffFilter !== 'all') {
        filtered = filtered.filter(c => (c.assignedToName || 'Chưa phân công') === staffFilter);
    }
    
    if (tagFilter !== 'all') {
        filtered = filtered.filter(company => {
            const tags = window.companyTags[company.id] || [];
            return tags.some(t => t.id === tagFilter);
        });
    }
    
    filtered.sort((a, b) => {
        const priorityA = getCompanyPriority(a);
        const priorityB = getCompanyPriority(b);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.name.localeCompare(b.name);
    });
    
    const container = document.getElementById('companyList');
    if (!container) return;
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">🏢 Không có công ty nào</div>';
        return;
    }
    
    container.innerHTML = filtered.map(company => {
        const stats = window.getCompanyStats(company.id);
        const tasks = window.getTasksByCompany(company.id);
        const isActive = window.selectedCompanyId === company.id;
        const isMyCompany = !isAdmin && company.assignedToName === currentUserName;
        
// Lấy thẻ của công ty - CHỈ HIỂN THỊ ICON
const companyTags = (window.companyTags && window.companyTags[company.id]) ? window.companyTags[company.id] : [];
const tagsHtml = companyTags.map(tag => `
    <span class="company-tag-icon" 
          style="background: ${tag.color}20; color: ${tag.color};" 
          title="${tag.name}"
          onclick="event.stopPropagation(); window.showTagInfo('${company.id}', '${tag.id}', '${tag.name}', '${tag.color}')">
        <i class="fas ${tag.icon || 'fa-tag'}"></i>
    </span>
`).join('');
        
        // Icon gán thẻ
        // Nút thêm thẻ (cùng hàng với icon)
const canAssignTag = isAdmin || isMyCompany;
const addTagButton = canAssignTag ? `
    <button class="btn-tag-assign" onclick="event.stopPropagation(); window.showQuickTagSelector('${company.id}', event)" title="Gán thẻ">
        <i class="fas fa-plus-circle"></i>
    </button>
` : '';
        // HTML tags container
const tagsContainerHtml = `
    <div class="company-tags">
        ${tagsHtml}
        ${addTagButton}
    </div>
`;
        const urgentTasks = tasks.filter(t => t.isUrgent === true && t.status !== 'done');
        const hasUrgent = urgentTasks.length > 0;
        
        let statusIcon = '', statusText = '', statusColor = '';
        if (hasUrgent) {
            statusIcon = '🔥'; statusText = 'Khẩn cấp'; statusColor = '#f44336';
        } else if (stats.overdue > 0) {
            statusIcon = '🔴'; statusText = 'Quá hạn'; statusColor = '#f44336';
        } else if (stats.pending > 0) {
            statusIcon = '⚠️'; statusText = 'Đang xử lý'; statusColor = '#ff9800';
        } else if (stats.total === 0 && tasks.filter(t => t.isRecurring).length === 0) {
            statusIcon = '✅'; statusText = 'Chưa có việc'; statusColor = '#4caf50';
        } else {
            statusIcon = '✅'; statusText = 'Hoàn thành'; statusColor = '#4caf50';
        }
        
        let totalTasks = stats.total;
        let completedTasks = stats.done;
        for (const task of tasks) {
            if (task.isRecurring === true) {
                totalTasks++;
                const isProcessed = (task.history || []).some(h => 
                    (h.action === 'completed' || h.action === 'skipped') && h.period === currentPeriod
                );
                if (isProcessed) completedTasks++;
            }
        }
        const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        const badgeClass = company.type === 'household' ? 'badge-hkd' : 'badge-company';
        const badgeText = company.type === 'household' ? 'HKD' : 'CTY';
        
        return `
            <div class="company-card-simple ${isActive ? 'active' : ''}" onclick="window.selectCompany('${company.id}')">
                <div class="company-row">
                    <div class="company-status-badge" style="background: ${statusColor}20; color: ${statusColor};">
                        ${statusIcon} ${statusText}
                    </div>
                    <span class="company-badge ${badgeClass}">${badgeText}</span>
                    <span class="company-name">${escapeHtml(company.name)}</span>
                    ${canAssignTag ? `<button class="btn-tag-assign" onclick="window.showQuickTagSelector('${company.id}', event)" title="Gán thẻ"><i class="fas fa-tag"></i></button>` : ''}
                </div>
                
                <div class="company-row">
                    <div class="company-staff">
                        <i class="fas fa-user"></i> ${escapeHtml(company.assignedToName) || 'Chưa phân công'}
                    </div>
                    <div class="company-progress-mini">
                        <div class="progress-bar-mini">
                            <div class="progress-fill-mini" style="width: ${percent}%"></div>
                        </div>
                        <span>${percent}%</span>
                    </div>
                </div>
                
                ${tagsHtml ? `<div class="company-tags">${tagsHtml}</div>` : '<div class="company-tags empty-tags">Chưa có thẻ</div>'}
            </div>
        `;
    }).join('');
};

// Hiển thị thông tin thẻ khi click vào icon
window.showTagInfo = function(companyId, tagId, tagName, tagColor, event) {
    if (event) event.stopPropagation();
    
    const tag = window.availableTags.find(t => t.id === tagId);
    if (!tag) return;
    
    // Tìm lịch sử gán thẻ gần nhất
    const tagHistory = (window.companyTagHistory && window.companyTagHistory[companyId]) ? window.companyTagHistory[companyId] : [];
    const lastAssignment = tagHistory.filter(h => h.tagId === tagId && h.action === 'assigned').pop();
    
    const message = `🏷️ ${tag.name}\n📅 ${lastAssignment ? new Date(lastAssignment.at).toLocaleString('vi-VN') : 'Chưa rõ'}\n👤 ${lastAssignment ? lastAssignment.byName : 'Chưa rõ'}`;
    
    window.showMessage(message);
};
// Hiển thị selector chọn thẻ nhanh
window.showQuickTagSelector = function(companyId) {
    const availableTags = window.availableTags || [];
    const currentTags = window.companyTags[companyId] || [];
    const currentTagIds = currentTags.map(t => t.id);
    
    const tagsHtml = availableTags.map(tag => `
        <label class="tag-option" style="display: flex; align-items: center; gap: 8px; padding: 8px; cursor: pointer; border-bottom: 1px solid #f0f0f0;">
            <input type="checkbox" value="${tag.id}" ${currentTagIds.includes(tag.id) ? 'checked' : ''}>
            <span class="tag-badge" style="background: ${tag.color}20; color: ${tag.color}; padding: 4px 10px; border-radius: 20px; font-size: 12px;">
                <i class="fas ${tag.icon || 'fa-tag'}"></i> ${tag.name}
            </span>
        </label>
    `).join('');
    
    const modalHtml = `
        <div style="max-height: 400px; overflow-y: auto;">
            <div style="margin-bottom: 15px; padding: 10px; background: #f0f2f5; border-radius: 8px;">
                <strong>🏷️ Chọn thẻ cho công ty</strong>
            </div>
            <div id="quickTagList">
                ${tagsHtml || '<div class="empty-state">Chưa có thẻ nào. Hãy tạo thẻ trong phần Nhân sự.</div>'}
            </div>
        </div>
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
            <button class="btn btn-primary" onclick="saveQuickTags('${companyId}')">Lưu thẻ</button>
            <button class="btn btn-secondary" onclick="window.closeTaskListModal()">Hủy</button>
        </div>
    `;
    
    document.getElementById('taskModalBody').innerHTML = modalHtml;
    document.getElementById('taskModalTitle').innerHTML = '🏷️ Gán thẻ cho công ty';
    document.getElementById('taskModal').classList.remove('hidden');
    
    // Lưu companyId tạm thời
    window._tempCompanyIdForTags = companyId;
};

// Lưu thẻ từ quick selector (CÓ LƯU LỊCH SỬ)
window.saveQuickTags = async function(companyId) {
    const checkboxes = document.querySelectorAll('#quickTagList input[type="checkbox"]');
    const selectedTagIds = [];
    checkboxes.forEach(cb => {
        if (cb.checked) selectedTagIds.push(cb.value);
    });
    
    const selectedTags = window.availableTags.filter(tag => selectedTagIds.includes(tag.id));
    
    // Lấy tags hiện tại
    const currentTags = window.companyTags?.[companyId] || [];
    const now = new Date().toISOString();
    
    // Lấy lịch sử hiện tại
    let tagHistory = [];
    if (window.companyTagHistory && window.companyTagHistory[companyId]) {
        tagHistory = window.companyTagHistory[companyId];
    } else {
        tagHistory = [];
        if (!window.companyTagHistory) window.companyTagHistory = {};
    }
    
    // Ghi nhận thẻ được thêm mới
    for (const tag of selectedTags) {
        if (!currentTags.some(t => t?.id === tag.id)) {
            tagHistory.push({
                tagId: tag.id,
                tagName: tag.name,
                tagColor: tag.color,
                action: 'assigned',
                by: window.currentUser.uid,
                byName: window.currentUserData?.name || window.currentUser?.email,
                at: now
            });
        }
    }
    
    // Ghi nhận thẻ bị xóa
    for (const existingTag of currentTags) {
        if (existingTag && !selectedTagIds.includes(existingTag.id)) {
            tagHistory.push({
                tagId: existingTag.id,
                tagName: existingTag.name,
                tagColor: existingTag.color,
                action: 'removed',
                by: window.currentUser.uid,
                byName: window.currentUserData?.name || window.currentUser?.email,
                at: now
            });
        }
    }
    
    // Lưu tags
    if (window.saveCompanyTags) {
        await window.saveCompanyTags(companyId, selectedTags);
    }
    
    // Lưu lịch sử
    if (window.saveCompanyTagHistory) {
        await window.saveCompanyTagHistory(companyId, tagHistory);
    } else {
        // Fallback: lưu trực tiếp vào window
        window.companyTagHistory[companyId] = tagHistory;
    }
    
    window.closeTaskListModal();
    window.renderCompanyList();
    if (window.selectedCompanyId === companyId && window.renderCompanyDetail) {
        await window.renderCompanyDetail(companyId);
    }
    window.showMessage('✅ Đã cập nhật thẻ và lưu lịch sử!');
};


// Hàm thoát HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
    if (window.loadCompanyTags) await window.loadCompanyTags();
    if (window.loadTagsConfig) await window.loadTagsConfig();
    
    const canAddCompany = window.currentUser != null;
    
    const html = `
        <div class="two-columns">
            <div class="company-list-panel">
                <div class="close-sidebar-btn" onclick="window.closeCompanyList()">Đóng</div>
                <div class="card">
                    <div class="card-title">
                        <span><i class="fas fa-list"></i> Danh sách HKD/Công ty</span>
                        <div style="display: flex; gap: 8px;">
                            ${canAddCompany ? '<button class="btn btn-primary btn-sm" onclick="window.showAddCompanyModal()"><i class="fas fa-plus"></i> Thêm</button>' : ''}
                            ${canAddCompany ? '<button class="btn btn-outline btn-sm" onclick="window.showImportExcelModal()"><i class="fas fa-file-import"></i> Import</button>' : ''}
                        </div>
                    </div>
                    <div class="search-box">
                        <input type="text" id="searchCompany" placeholder="🔍 Tìm kiếm công ty/HKD...">
                    </div>
                    <div class="filter-group">
                        <select class="filter-select" id="filterStaff">
                            <option value="all">👥 Đang tải...</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <select class="filter-select" id="filterTag">
                            <option value="all">🏷️ Tất cả thẻ</option>
                        </select>
                    </div>
                    <div class="company-items" id="companyList"></div>
                </div>
            </div>
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
    renderTagFilter();
    
    const searchInput = document.getElementById('searchCompany');
    const staffFilter = document.getElementById('filterStaff');
    const tagFilter = document.getElementById('filterTag');
    
    if (searchInput) searchInput.addEventListener('input', () => window.renderCompanyList());
    if (staffFilter) staffFilter.addEventListener('change', () => window.renderCompanyList());
    if (tagFilter) tagFilter.addEventListener('change', () => window.renderCompanyList());
    
    window.renderCompanyList();
    
    const staffFilterValue = staffFilter?.value;
    let firstCompany = null;
    if (staffFilterValue === 'all') {
        firstCompany = window.companiesList[0];
    } else if (staffFilterValue && staffFilterValue !== 'all') {
        firstCompany = window.companiesList.find(c => c.assignedToName === staffFilterValue);
        if (!firstCompany) firstCompany = window.companiesList[0];
    } else {
        firstCompany = window.companiesList[0];
    }
    
    if (firstCompany && !window.selectedCompanyId) {
        window.selectCompany(firstCompany.id);
    } else if (window.selectedCompanyId && window.renderCompanyDetail) {
        await window.renderCompanyDetail(window.selectedCompanyId);
    }
};

// ========== REALTIME TAGS UPDATE ==========
let tagsRealtimeListener = null;

window.startTagsRealtimeListener = function() {
    if (tagsRealtimeListener) return;
    
    const tagsRef = window.firebaseRef(window.firebaseDb, 'company_tags');
    
    tagsRealtimeListener = tagsRef.on('value', async () => {
        if (window.loadCompanyTags) await window.loadCompanyTags();
        if (window.currentView === 'companies') {
            window.renderCompanyList();
            if (window.selectedCompanyId && window.renderCompanyDetail) {
                await window.renderCompanyDetail(window.selectedCompanyId);
            }
        }
    });
};

window.stopTagsRealtimeListener = function() {
    if (tagsRealtimeListener && window.firebaseDb) {
        const tagsRef = window.firebaseRef(window.firebaseDb, 'company_tags');
        tagsRef.off('value', tagsRealtimeListener);
        tagsRealtimeListener = null;
    }
};

// ========== MOBILE FUNCTIONS ==========
let isCompanyListOpen = false;

window.openCompanyList = function() {
    const sidebar = document.querySelector('.company-list-panel');
    if (sidebar) {
        sidebar.classList.add('open');
        isCompanyListOpen = true;
    }
};

window.closeCompanyList = function() {
    const sidebar = document.querySelector('.company-list-panel');
    if (sidebar) {
        sidebar.classList.remove('open');
        isCompanyListOpen = false;
    }
};

window.toggleCompanyList = function() {
    if (isCompanyListOpen) window.closeCompanyList();
    else window.openCompanyList();
};

window.backToCompanyList = function() {
    window.openCompanyList();
    const detailPanel = document.querySelector('.company-detail-panel');
    if (detailPanel) detailPanel.scrollTop = 0;
};

const originalSelectCompany = window.selectCompany;
window.selectCompany = function(companyId) {
    window.selectedCompanyId = companyId;
    window.renderCompanyList();
    if (window.renderCompanyDetail) window.renderCompanyDetail(companyId);
    if (window.innerWidth <= 768) window.closeCompanyList();
};

// Khởi tạo realtime listener
if (window.startTagsRealtimeListener) {
    window.startTagsRealtimeListener();
}

console.log('Company list module with tags and realtime loaded!');