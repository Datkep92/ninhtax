// ========== HỆ THỐNG CHAT NỘI BỘ ==========

let chatListener = null;
let currentChatRoom = 'general';
let isChatOpen = false;

// Mở/Đóng chat
window.toggleChat = function() {
    const chatWidget = document.getElementById('chatWidget');
    if (chatWidget) {
        if (chatWidget.classList.contains('hidden')) {
            chatWidget.classList.remove('hidden');
            isChatOpen = true;
            loadChatMessages();
            // Bắt đầu lắng nghe realtime khi mở chat
            startRealtimeListener();
        } else {
            chatWidget.classList.add('hidden');
            isChatOpen = false;
            // Không dừng listener để vẫn nhận thông báo
        }
    }
};

// Mở chat với công ty cụ thể
window.openChatForCompany = function(companyId, companyName) {
    currentChatRoom = `company_${companyId}`;
    const chatHeader = document.getElementById('chatHeaderTitle');
    if (chatHeader) {
        chatHeader.innerHTML = `<i class="fas fa-building"></i> Chat: ${companyName}`;
    }
    const backBtn = document.getElementById('chatBackBtn');
    if (backBtn) backBtn.style.display = 'flex';
    if (!isChatOpen) {
        window.toggleChat();
    } else {
        loadChatMessages();
    }
};

// Quay lại chat chung
window.backToGeneralChat = function() {
    currentChatRoom = 'general';
    const chatHeader = document.getElementById('chatHeaderTitle');
    if (chatHeader) {
        chatHeader.innerHTML = '<i class="fas fa-comments"></i> Chat nội bộ';
    }
    const backBtn = document.getElementById('chatBackBtn');
    if (backBtn) backBtn.style.display = 'none';
    loadChatMessages();
};

// Gửi tin nhắn
window.sendChatMessage = async function() {
    const input = document.getElementById('chatMessageInput');
    const message = input.value.trim();
    if (!message) return;
    
    const messageData = {
        text: message,
        userId: window.currentUser.uid,
        userName: window.currentUserData?.name || window.currentUser?.email,
        userRole: window.currentUserRole,
        room: currentChatRoom,
        timestamp: new Date().toISOString(),
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    const chatRef = window.firebaseRef(window.firebaseDb, 'chat_messages');
    await window.firebasePush(chatRef, messageData);
    
    input.value = '';
    input.focus();
    scrollChatToBottom();
};

// Tải tin nhắn
window.loadChatMessages = async function() {
    const chatRef = window.firebaseRef(window.firebaseDb, 'chat_messages');
    const snapshot = await window.firebaseGet(chatRef);
    const messages = [];
    
    if (snapshot.exists()) {
        const data = snapshot.val();
        for (const key in data) {
            if (data[key].room === currentChatRoom) {
                messages.push({ id: key, ...data[key] });
            }
        }
    }
    
    messages.sort((a, b) => (a.timestamp || a.createdAt || 0) - (b.timestamp || b.createdAt || 0));
    
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    
    if (messages.length === 0) {
        container.innerHTML = '<div class="chat-empty">💬 Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!</div>';
        return;
    }
    
    container.innerHTML = messages.map(msg => {
        const isOwn = msg.userId === window.currentUser.uid;
        const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
        const date = msg.timestamp ? new Date(msg.timestamp).toLocaleDateString('vi-VN') : '';
        
        return `
            <div class="chat-message ${isOwn ? 'own' : 'other'}">
                <div class="chat-message-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="chat-message-content">
                    <div class="chat-message-header">
                        <span class="chat-message-name">${escapeHtml(msg.userName)}</span>
                        <span class="chat-message-time">${date} ${time}</span>
                        ${isAdmin && !isOwn ? `
                            <button class="chat-message-delete" onclick="deleteChatMessage('${msg.id}')">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : ''}
                    </div>
                    <div class="chat-message-text">${escapeHtml(msg.text)}</div>
                </div>
            </div>
        `;
    }).join('');
    
    scrollChatToBottom();
};

// Xóa tin nhắn
window.deleteChatMessage = async function(messageId) {
    if (confirm('Bạn có chắc muốn xóa tin nhắn này?')) {
        const msgRef = window.firebaseRef(window.firebaseDb, `chat_messages/${messageId}`);
        await window.firebaseRemove(msgRef);
        // Reload messages
        loadChatMessages();
    }
};

// Bắt đầu lắng nghe realtime
let isListening = false;

function startRealtimeListener() {
    if (isListening) return;
    
    isListening = true;
    const chatRef = window.firebaseRef(window.firebaseDb, 'chat_messages');
    
    // Lắng nghe tin nhắn mới
    chatRef.on('child_added', (snapshot) => {
        const msg = { id: snapshot.key, ...snapshot.val() };
        
        // Chỉ xử lý tin nhắn thuộc phòng hiện tại
        if (msg.room === currentChatRoom && isChatOpen) {
            // Thêm tin nhắn mới vào cuối danh sách
            const container = document.getElementById('chatMessages');
            const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
            const isOwn = msg.userId === window.currentUser.uid;
            const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
            const date = msg.timestamp ? new Date(msg.timestamp).toLocaleDateString('vi-VN') : '';
            
            // Kiểm tra nếu có tin nhắn empty, bỏ qua
            if (container && container.innerHTML.includes('chat-empty')) {
                loadChatMessages();
            } else {
                const messageHtml = `
                    <div class="chat-message ${isOwn ? 'own' : 'other'}">
                        <div class="chat-message-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="chat-message-content">
                            <div class="chat-message-header">
                                <span class="chat-message-name">${escapeHtml(msg.userName)}</span>
                                <span class="chat-message-time">${date} ${time}</span>
                                ${isAdmin && !isOwn ? `
                                    <button class="chat-message-delete" onclick="deleteChatMessage('${msg.id}')">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="chat-message-text">${escapeHtml(msg.text)}</div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', messageHtml);
                scrollChatToBottom();
                playChatSound();
            }
        } else if (msg.room !== currentChatRoom && !isChatOpen) {
            // Cập nhật badge khi có tin nhắn ở phòng khác
            updateChatBadge();
        }
    });
    
    // Lắng nghe tin nhắn bị xóa
    chatRef.on('child_removed', (snapshot) => {
        const removedId = snapshot.key;
        const messageElement = document.querySelector(`.chat-message[data-id="${removedId}"]`);
        if (messageElement) {
            messageElement.remove();
        } else {
            // Nếu không tìm thấy, reload toàn bộ
            loadChatMessages();
        }
    });
}

// Dừng lắng nghe
window.stopChatListener = function() {
    if (isListening && window.firebaseDb) {
        const chatRef = window.firebaseRef(window.firebaseDb, 'chat_messages');
        chatRef.off();
        isListening = false;
    }
};

// Cập nhật badge tin nhắn chưa đọc
let unreadCount = 0;

function updateChatBadge() {
    unreadCount++;
    const badge = document.getElementById('chatBadge');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = 'inline-block';
    }
}

function resetChatBadge() {
    unreadCount = 0;
    const badge = document.getElementById('chatBadge');
    if (badge) {
        badge.textContent = '0';
        badge.style.display = 'none';
    }
}

// Cuộn xuống cuối chat
function scrollChatToBottom() {
    const container = document.getElementById('chatMessages');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// Âm thanh thông báo tin nhắn
let chatSound = null;
function initChatSound() {
    try {
        chatSound = new Audio('https://www.soundjay.com/misc/sounds/message-alert-02.mp3');
        chatSound.volume = 0.3;
    } catch (e) {}
}
function playChatSound() {
    if (chatSound && !document.hidden) {
        chatSound.play().catch(e => {});
    }
}

// Reset badge khi mở chat
window.resetChatBadgeOnOpen = function() {
    resetChatBadge();
};

// Khởi tạo chat
window.initChat = function() {
    initChatSound();
    startRealtimeListener();
    console.log('Chat initialized with realtime listener');
};

// Xử lý phím Enter
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && document.activeElement?.id === 'chatMessageInput') {
        e.preventDefault();
        window.sendChatMessage();
    }
});

// Reset badge khi click vào chat FAB
const chatFabBtn = document.getElementById('chatFabBtn');
if (chatFabBtn) {
    chatFabBtn.addEventListener('click', () => {
        resetChatBadge();
    });
}

// Hàm thoát HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

console.log('Chat module loaded with realtime!');