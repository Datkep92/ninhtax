// ========== CRUD CÔNG TY/HKD ==========

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

// Thêm công ty
window.showAddCompanyModal = function() {
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    
    window.loadUsers().then(() => {
        const staffOptions = isAdmin ? `
            <option value="">-- Chưa phân công --</option>
            ${window.usersList.filter(u => u.role === 'staff').map(u => `<option value="${u.uid}">${u.name}</option>`).join('')}
        ` : `<input type="hidden" name="assignedTo" value="${window.currentUser.uid}">`;
        
        const tagsHtml = (window.availableTags || []).map(tag => `
            <label class="tag-checkbox" style="display: inline-flex; align-items: center; gap: 6px; margin-right: 12px; margin-bottom: 8px; cursor: pointer;">
                <input type="checkbox" name="tags" value="${tag.id}">
                <span class="tag-badge" style="background: ${tag.color}20; color: ${tag.color}; padding: 4px 10px; border-radius: 20px; font-size: 12px;">
                    <i class="fas ${tag.icon || 'fa-tag'}"></i> ${tag.name}
                </span>
            </label>
        `).join('');
        
        const html = `
            <form id="addCompanyForm">
                <div class="form-group">
                    <label>Tên công ty/HKD *</label>
                    <input type="text" name="name" required placeholder="Ví dụ: Cửa hàng An Phát">
                </div>
                <div class="form-group">
                    <label>Loại hình</label>
                    <select name="type">
                        <option value="household">🏪 Hộ kinh doanh (HKD)</option>
                        <option value="company">🏭 Công ty</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Địa chỉ</label>
                    <input type="text" name="address" placeholder="Số nhà, đường, quận, TP">
                </div>
                <div class="form-group">
                    <label>Số điện thoại</label>
                    <input type="tel" name="phone" placeholder="0903 xxx xxx">
                </div>
                <div class="form-group">
                    <label>Mã số thuế</label>
                    <input type="text" name="taxCode" placeholder="0123456789">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-tags"></i> Thẻ công ty</label>
                    <div class="tags-selector" id="tagsSelector">
                        ${tagsHtml || '<p class="empty-state">Chưa có thẻ nào. Hãy tạo thẻ trước.</p>'}
                    </div>
                    <small>Chọn thẻ để phân loại công ty</small>
                </div>
                ${isAdmin ? `
                    <div class="form-group">
                        <label><i class="fas fa-user-tie"></i> Nhân viên phụ trách</label>
                        <select name="assignedTo">${staffOptions}</select>
                    </div>
                ` : `
                    <div class="form-group">
                        <label><i class="fas fa-user-tie"></i> Nhân viên phụ trách</label>
                        <div class="info-box">👤 ${window.currentUserData?.name || window.currentUser?.email} (bạn sẽ phụ trách)</div>
                        ${staffOptions}
                    </div>
                `}
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Lưu</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal('entityModal')">Hủy</button>
                </div>
            </form>
        `;
        
        document.getElementById('modalBody').innerHTML = html;
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Thêm HKD/Công ty';
        document.getElementById('entityModal').classList.remove('hidden');
        
        document.getElementById('addCompanyForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            window.showLoading();
            
            const formData = new FormData(e.target);
            let assignedTo = formData.get('assignedTo');
            let assignedToName = '';
            
            if (isAdmin) {
                const u = window.usersList.find(u => u.uid === assignedTo);
                assignedToName = u?.name || 'Chưa phân công';
            } else {
                assignedTo = window.currentUser.uid;
                assignedToName = window.currentUserData?.name;
            }
            
            // Lấy các thẻ được chọn
            const selectedTagIds = formData.getAll('tags');
            const selectedTags = (window.availableTags || []).filter(tag => selectedTagIds.includes(tag.id));
            
            const newCompany = {
                name: formData.get('name'),
                type: formData.get('type'),
                address: formData.get('address') || '',
                phone: formData.get('phone') || '',
                taxCode: formData.get('taxCode') || '',
                assignedTo: assignedTo || null,
                assignedToName: assignedToName || 'Chưa phân công',
                createdAt: new Date().toISOString(),
                history: [{
                    action: 'created',
                    title: 'Tạo công ty',
                    description: `Công ty "${formData.get('name')}" được tạo bởi ${window.currentUserData?.name}`,
                    by: window.currentUser.uid,
                    byName: window.currentUserData?.name,
                    at: new Date().toISOString()
                }]
            };
            
            const companiesRef = window.firebaseRef(window.firebaseDb, 'companies');
            const newCompanyRef = await window.firebasePush(companiesRef, newCompany);
            const newCompanyId = newCompanyRef.key;
            
            // Lưu thẻ cho công ty
            if (selectedTags.length > 0 && window.saveCompanyTags) {
                await window.saveCompanyTags(newCompanyId, selectedTags);
            }
            
            await window.loadCompanies();
            
            setTimeout(async () => {
                const addedCompany = window.companiesList.find(c => c.id === newCompanyId);
                if (addedCompany && window.generateTasksForCompany) {
                    await window.generateTasksForCompany(newCompanyId);
                }
                await window.loadAllData();
                if (window.loadCompanyTags) await window.loadCompanyTags();
                window.renderCompanyList();
                if (window.selectedCompanyId === newCompanyId && window.renderCompanyDetail) {
                    await window.renderCompanyDetail(newCompanyId);
                }
                window.hideLoading();
                closeModal('entityModal');
                window.selectCompany(newCompanyId);
                window.showMessage('✅ Thêm công ty thành công!');
            }, 500);
        });
    });
};

// Sửa công ty
window.showEditCompanyModal = function(companyId) {
    const company = window.companiesList.find(c => c.id === companyId);
    if (!company) return;
    
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    const isAssignedStaff = company.assignedTo === window.currentUser?.uid;
    
    if (!isAdmin && !isAssignedStaff) {
        window.showMessage('🔒 Bạn không có quyền sửa công ty này!');
        return;
    }
    
    const currentTags = window.companyTags[companyId] || [];
    
    window.loadUsers().then(() => {
        const staffOptions = window.usersList
            .filter(u => u.role === 'staff')
            .map(u => `<option value="${u.uid}" ${company.assignedTo === u.uid ? 'selected' : ''}>${u.name}</option>`)
            .join('');
        
        const tagsHtml = (window.availableTags || []).map(tag => `
            <label class="tag-checkbox" style="display: inline-flex; align-items: center; gap: 6px; margin-right: 12px; margin-bottom: 8px; cursor: pointer;">
                <input type="checkbox" name="tags" value="${tag.id}" ${currentTags.some(t => t.id === tag.id) ? 'checked' : ''}>
                <span class="tag-badge" style="background: ${tag.color}20; color: ${tag.color}; padding: 4px 10px; border-radius: 20px; font-size: 12px;">
                    <i class="fas ${tag.icon || 'fa-tag'}"></i> ${tag.name}
                </span>
            </label>
        `).join('');
        
        const historyHtml = company.history && company.history.length > 0 ? `
            <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px; font-size: 12px;">
                <strong><i class="fas fa-history"></i> Lịch sử thay đổi:</strong>
                <div style="margin-top: 5px;">
                    ${company.history.slice(-5).map(h => `
                        <div style="padding: 4px 0; border-bottom: 1px solid #eee;">
                            ${h.action === 'updated' ? '✏️' : h.action === 'transferred' ? '🔄' : '✨'} 
                            ${h.title || h.action}: ${h.description}
                            <span style="color: #999; font-size: 10px; float: right;">${new Date(h.at).toLocaleString()}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';
        
        const html = `
            <form id="editCompanyForm">
                <div class="form-group">
                    <label>Tên công ty/HKD *</label>
                    <input type="text" name="name" value="${(company.name || '').replace(/"/g, '&quot;')}" required>
                </div>
                <div class="form-group">
                    <label>Loại hình</label>
                    <select name="type">
                        <option value="household" ${company.type === 'household' ? 'selected' : ''}>🏪 Hộ kinh doanh (HKD)</option>
                        <option value="company" ${company.type === 'company' ? 'selected' : ''}>🏭 Công ty</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Địa chỉ</label>
                    <input type="text" name="address" value="${(company.address || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group">
                    <label>Số điện thoại</label>
                    <input type="tel" name="phone" value="${(company.phone || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group">
                    <label>Mã số thuế</label>
                    <input type="text" name="taxCode" value="${(company.taxCode || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-tags"></i> Thẻ công ty</label>
                    <div class="tags-selector">
                        ${tagsHtml || '<p class="empty-state">Chưa có thẻ nào.</p>'}
                    </div>
                    <small>Chọn thẻ để phân loại công ty</small>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-user-tie"></i> Nhân viên phụ trách</label>
                    <select name="assignedTo">
                        <option value="">-- Chưa phân công --</option>
                        ${staffOptions}
                    </select>
                    <small>Thay đổi nhân viên phụ trách sẽ được lưu vào lịch sử</small>
                </div>
                ${historyHtml}
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Cập nhật</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal('entityModal')">Hủy</button>
                </div>
            </form>
        `;
        
        document.getElementById('modalBody').innerHTML = html;
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Sửa HKD/Công ty';
        document.getElementById('entityModal').classList.remove('hidden');
        
        document.getElementById('editCompanyForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            window.showLoading();
            
            const formData = new FormData(e.target);
            const newAssignedTo = formData.get('assignedTo');
            const newAssignedUser = window.usersList.find(u => u.uid === newAssignedTo);
            
            // Lấy các thẻ được chọn
            const selectedTagIds = formData.getAll('tags');
            const selectedTags = (window.availableTags || []).filter(tag => selectedTagIds.includes(tag.id));
            
            const updates = {
                name: formData.get('name'),
                type: formData.get('type'),
                address: formData.get('address') || '',
                phone: formData.get('phone') || '',
                taxCode: formData.get('taxCode') || '',
                updatedBy: window.currentUser.uid,
                updatedByName: window.currentUserData?.name,
                updatedAt: new Date().toISOString()
            };
            
            const isTransferring = newAssignedTo !== company.assignedTo;
            
            if (newAssignedTo) {
                updates.assignedTo = newAssignedTo;
                updates.assignedToName = newAssignedUser?.name || 'Chưa phân công';
            } else {
                updates.assignedTo = null;
                updates.assignedToName = 'Chưa phân công';
            }
            
            // Lưu lịch sử
            const history = company.history || [];
            if (isTransferring && newAssignedTo) {
                const oldStaffName = company.assignedToName || 'Chưa phân công';
                const newStaffName = newAssignedUser?.name || 'Chưa phân công';
                history.push({
                    action: 'transferred',
                    title: 'Chuyển giao quyền quản lý',
                    description: `${window.currentUserData?.name} đã chuyển quyền quản lý từ "${oldStaffName}" sang "${newStaffName}"`,
                    by: window.currentUser.uid,
                    byName: window.currentUserData?.name,
                    from: company.assignedTo,
                    fromName: oldStaffName,
                    to: newAssignedTo,
                    toName: newStaffName,
                    at: new Date().toISOString()
                });
            } else {
                let changedFields = [];
                if (updates.name !== company.name) changedFields.push('tên');
                if (updates.address !== company.address) changedFields.push('địa chỉ');
                if (updates.phone !== company.phone) changedFields.push('số điện thoại');
                if (updates.taxCode !== company.taxCode) changedFields.push('mã số thuế');
                if (changedFields.length > 0) {
                    history.push({
                        action: 'updated',
                        title: 'Cập nhật thông tin',
                        description: `${window.currentUserData?.name} đã cập nhật: ${changedFields.join(', ')}`,
                        by: window.currentUser.uid,
                        byName: window.currentUserData?.name,
                        changes: changedFields,
                        at: new Date().toISOString()
                    });
                }
            }
            updates.history = history;
            
            const companyRef = window.firebaseRef(window.firebaseDb, `companies/${companyId}`);
            await window.firebaseUpdate(companyRef, updates);
            
            // Cập nhật thẻ
            if (window.saveCompanyTags) {
                await window.saveCompanyTags(companyId, selectedTags);
            }
            
            window.hideLoading();
            closeModal('entityModal');
            await window.loadCompanies();
            if (window.loadCompanyTags) await window.loadCompanyTags();
            window.renderCompanyList();
            await window.renderCompanyDetail(companyId);
            
            if (isTransferring) {
                window.showMessage(`✅ Đã chuyển quyền quản lý cho ${newAssignedUser?.name || 'người khác'}!`);
            } else {
                window.showMessage('✅ Cập nhật thành công!');
            }
        });
    });
};

// Xóa công ty
window.deleteCompany = async function(companyId) {
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    if (!isAdmin) {
        window.showMessage('🔒 Chỉ Admin mới có quyền xóa công ty!');
        return;
    }
    
    const company = window.companiesList.find(c => c.id === companyId);
    if (!company) return;
    
    const taskCount = window.getTasksByCompany(companyId).length;
    const confirmMsg = taskCount > 0 
        ? `⚠️ Công ty "${company.name}" có ${taskCount} công việc.\n\nXóa sẽ mất tất cả! Bạn chắc chắn?`
        : `❓ Xóa công ty "${company.name}"?`;
    
    if (!confirm(confirmMsg)) return;
    
    window.showLoading();
    
    await window.firebaseRemove(window.firebaseRef(window.firebaseDb, `companies/${companyId}`));
    
    // Xóa tags của công ty
    if (window.saveCompanyTags) {
        await window.saveCompanyTags(companyId, []);
    }
    
    const tasksToDelete = window.tasksList.filter(t => t.companyId === companyId);
    for (const task of tasksToDelete) {
        await window.firebaseRemove(window.firebaseRef(window.firebaseDb, `tasks/${task.id}`));
    }
    
    await window.loadAllData();
    window.hideLoading();
    
    if (window.selectedCompanyId === companyId) {
        window.selectedCompanyId = null;
        const detailPanel = document.getElementById('companyDetailPanel');
        if (detailPanel) {
            detailPanel.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-building" style="font-size: 48px;"></i>
                    <p>🏢 Chọn một công ty/HKD để xem chi tiết</p>
                </div>
            `;
        }
    }
    
    window.renderCompanyList();
    if (window.renderDashboard) await window.renderDashboard();
    window.showMessage(`✅ Đã xóa công ty "${company.name}"!`);
};

console.log('Company CRUD module with tags loaded!');