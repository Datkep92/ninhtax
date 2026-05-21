// ========== HỆ THỐNG THẺ (TAGS) ==========
window.companyTags = window.companyTags || {};
window.companyTagHistory = window.companyTagHistory || {};
// Danh sách thẻ mặc định
window.availableTags = [
    { id: 'tax_declaration', name: '📊 Nộp tờ khai', color: '#4f46e5', icon: 'fa-file-invoice' },
    { id: 'financial_report', name: '📈 Báo cáo tài chính', color: '#10b981', icon: 'fa-chart-line' },
    { id: 'insurance', name: '🏥 Bảo hiểm', color: '#f59e0b', icon: 'fa-shield-alt' },
    { id: 'invoice', name: '📄 Hóa đơn', color: '#3b82f6', icon: 'fa-receipt' },
    { id: 'contract', name: '📝 Hợp đồng', color: '#8b5cf6', icon: 'fa-file-signature' },
    { id: 'tax_finalization', name: '💰 Quyết toán thuế', color: '#ef4444', icon: 'fa-calculator' }
];

// Lưu tags của công ty
window.companyTags = {};

// Tải cấu hình thẻ từ Firebase
window.loadTagsConfig = async function() {
    const tagsConfigRef = window.firebaseRef(window.firebaseDb, 'tags_config');
    const snapshot = await window.firebaseGet(tagsConfigRef);
    
    if (snapshot.exists()) {
        window.availableTags = snapshot.val();
    } else {
        await window.firebaseSet(tagsConfigRef, window.availableTags);
    }
    return window.availableTags;
};
// Tải lịch sử gán thẻ từ Firebase
window.loadCompanyTagHistory = async function() {
    const historyRef = window.firebaseRef(window.firebaseDb, 'company_tag_history');
    const snapshot = await window.firebaseGet(historyRef);
    
    if (!window.companyTagHistory) window.companyTagHistory = {};
    
    if (snapshot.exists()) {
        window.companyTagHistory = snapshot.val();
    } else {
        window.companyTagHistory = {};
    }
    
    console.log('Loaded tag history:', Object.keys(window.companyTagHistory).length, 'companies');
    return window.companyTagHistory;
};

// Lưu lịch sử gán thẻ lên Firebase
window.saveCompanyTagHistory = async function(companyId, history) {
    const historyRef = window.firebaseRef(window.firebaseDb, `company_tag_history/${companyId}`);
    await window.firebaseSet(historyRef, history);
    if (!window.companyTagHistory) window.companyTagHistory = {};
    window.companyTagHistory[companyId] = history;
    console.log(`Saved tag history for company ${companyId}: ${history.length} records`);
};
// Tải tags của công ty
window.loadCompanyTags = async function() {
    const tagsRef = window.firebaseRef(window.firebaseDb, 'company_tags');
    const snapshot = await window.firebaseGet(tagsRef);
    window.companyTags = {};
    
    if (snapshot.exists()) {
        window.companyTags = snapshot.val();
    }
    return window.companyTags;
};

// Lưu tags cho công ty
window.saveCompanyTags = async function(companyId, tags) {
    const tagsRef = window.firebaseRef(window.firebaseDb, `company_tags/${companyId}`);
    await window.firebaseSet(tagsRef, tags);
    window.companyTags[companyId] = tags;
    
    // Cập nhật realtime cho các client khác
    return true;
};

// Tự động cập nhật thẻ khi hoàn thành công việc định kỳ
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
            return true;
        }
    }
    return false;
};

// Gán thẻ thủ công
window.manualAssignTagToCompany = async function(companyId, tagId) {
    const tag = window.availableTags.find(t => t.id === tagId);
    if (!tag) return false;
    
    const currentTags = window.companyTags[companyId] || [];
    if (!currentTags.some(t => t.id === tagId)) {
        currentTags.push(tag);
        await window.saveCompanyTags(companyId, currentTags);
        return true;
    }
    return false;
};

// Xóa thẻ khỏi công ty
window.removeTagFromCompany = async function(companyId, tagId) {
    const currentTags = window.companyTags[companyId] || [];
    const newTags = currentTags.filter(t => t.id !== tagId);
    await window.saveCompanyTags(companyId, newTags);
    return true;
};

// Thêm thẻ mới (chỉ admin)
window.createNewTag = async function(tagName, tagColor, tagIcon) {
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    if (!isAdmin) {
        window.showMessage('🔒 Chỉ Admin mới có thể tạo thẻ!');
        return null;
    }
    
    const newTag = {
        id: `tag_${Date.now()}`,
        name: tagName,
        color: tagColor,
        icon: tagIcon || 'fa-tag'
    };
    window.availableTags.push(newTag);
    
    const tagsConfigRef = window.firebaseRef(window.firebaseDb, 'tags_config');
    await window.firebaseSet(tagsConfigRef, window.availableTags);
    
    return newTag;
};

// Xóa thẻ (chỉ admin)
window.deleteTag = async function(tagId) {
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    if (!isAdmin) {
        window.showMessage('🔒 Chỉ Admin mới có thể xóa thẻ!');
        return;
    }
    
    window.availableTags = window.availableTags.filter(t => t.id !== tagId);
    const tagsConfigRef = window.firebaseRef(window.firebaseDb, 'tags_config');
    await window.firebaseSet(tagsConfigRef, window.availableTags);
    
    // Xóa thẻ khỏi tất cả công ty
    for (const companyId in window.companyTags) {
        const newTags = window.companyTags[companyId].filter(t => t.id !== tagId);
        await window.saveCompanyTags(companyId, newTags);
    }
    
    window.showMessage('✅ Đã xóa thẻ!');
};

console.log('Tags module loaded!');