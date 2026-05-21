// Quản lý đăng nhập/đăng xuất với Firebase Auth
window.currentUser = null;
window.currentUserRole = 'staff';
window.currentUserData = null;

// Hàm fill demo account
window.fillDemoAccount = function(email, password) {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    if (emailInput) emailInput.value = email;
    if (passwordInput) passwordInput.value = password;
    const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
    if (loginTab) loginTab.click();
};

// Chuyển tab đăng nhập/đăng ký
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(`${tab}Tab`).classList.remove('hidden');
    });
});

// Xử lý đăng ký
const registerForm = document.getElementById('registerFormElement');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        window.showLoading();
        
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        const role = document.getElementById('regRole').value;
        
        if (password !== confirmPassword) {
            window.hideLoading();
            alert('Mật khẩu xác nhận không khớp!');
            return;
        }
        if (password.length < 6) {
            window.hideLoading();
            alert('Mật khẩu phải có ít nhất 6 ký tự!');
            return;
        }
        
        try {
            const userCredential = await window.firebaseCreateUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            const userRef = window.firebaseRef(window.firebaseDb, `users/${user.uid}`);
            await window.firebaseSet(userRef, {
                uid: user.uid, name: name, email: email, role: role, createdAt: new Date().toISOString()
            });
            window.hideLoading();
            alert('Đăng ký thành công! Vui lòng đăng nhập.');
            const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
            if (loginTab) loginTab.click();
            document.getElementById('regName').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('regConfirmPassword').value = '';
        } catch (error) {
            window.hideLoading();
            console.error('Register error:', error);
            let errorMsg = 'Đăng ký thất bại!';
            if (error.code === 'auth/email-already-in-use') errorMsg = 'Email đã được sử dụng!';
            else if (error.code === 'auth/invalid-email') errorMsg = 'Email không hợp lệ!';
            else if (error.code === 'auth/weak-password') errorMsg = 'Mật khẩu quá yếu! (tối thiểu 6 ký tự)';
            alert(errorMsg);
        }
    });
}

// Xử lý đăng nhập
const loginForm = document.getElementById('loginFormElement');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        window.showLoading();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const userCredential = await window.firebaseSignInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            const userRef = window.firebaseRef(window.firebaseDb, `users/${user.uid}`);
            const snapshot = await window.firebaseGet(userRef);
            let userData = snapshot.val();
            
            if (!userData) {
                userData = { uid: user.uid, name: email.split('@')[0], email: email, role: email.includes('admin') ? 'admin' : 'staff', createdAt: new Date().toISOString() };
                await window.firebaseSet(userRef, userData);
            }
            
            window.currentUser = user;
            window.currentUserData = userData;
            window.currentUserRole = userData.role;
            sessionStorage.setItem('currentUser', JSON.stringify({ uid: user.uid, name: userData.name, email: userData.email, role: userData.role }));
            window.hideLoading();
            
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('mainApp').classList.remove('hidden');
            document.getElementById('userName').textContent = userData.name;
            document.getElementById('userRole').textContent = userData.role === 'admin' ? 'Admin' : 'Nhân viên';
            
            // ========== PHÂN QUYỀN MENU ==========
            const dashboardBtn = document.getElementById('dashboardMenuBtn');
            const progressBtn = document.getElementById('progressMenuBtn');
            const usersBtn = document.getElementById('usersMenuBtn');
            
            if (userData.role === 'admin') {
                if (dashboardBtn) dashboardBtn.style.display = 'flex';
                if (progressBtn) progressBtn.style.display = 'none';
                if (usersBtn) usersBtn.style.display = 'flex';
                if (window.switchView) window.switchView('dashboard');
            } else {
                if (dashboardBtn) dashboardBtn.style.display = 'none';
                if (progressBtn) progressBtn.style.display = 'flex';
                if (usersBtn) usersBtn.style.display = 'none';
                if (window.switchView) window.switchView('companies');
            }
            
            if (window.loadAllData) await window.loadAllData();
            if (window.updateBadges) await window.updateBadges();
            if (window.renderDashboard) await window.renderDashboard();
            if (window.setupAppEventListeners) window.setupAppEventListeners();
            
            // ========== KHỞI TẠO REALTIME LISTENERS ==========
            if (window.initRealtimeListeners) {
                window.initRealtimeListeners();
            }
            if (window.initChat) {
    window.initChat();
}
            // ========== KHỞI TẠO NOTIFICATION ==========
            if (window.requestNotificationPermission) {
                window.requestNotificationPermission();
            }
            if (window.startNotificationChecker) {
                window.startNotificationChecker();
            }
            if (window.listenForNotifications) {
                window.listenForNotifications();
            }
            if (window.loadUserNotifications) {
                await window.loadUserNotifications();
            }
            
            if (window.initProgressRealtime) window.initProgressRealtime();
            if (window.scheduleRecurringTasks) {
                setTimeout(() => window.scheduleRecurringTasks(), 2000);
            }
        } catch (error) {
            window.hideLoading();
            console.error('Login error:', error);
            let errorMsg = 'Sai email hoặc mật khẩu!';
            if (error.code === 'auth/user-not-found') errorMsg = 'Tài khoản không tồn tại! Vui lòng đăng ký.';
            else if (error.code === 'auth/wrong-password') errorMsg = 'Sai mật khẩu!';
            else if (error.code === 'auth/invalid-email') errorMsg = 'Email không hợp lệ!';
            alert(errorMsg + '\n\n📝 Chưa có tài khoản? Hãy đăng ký ở tab "Đăng ký"');
        }
    });
}

// Đăng xuất
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await window.firebaseSignOut();
        
        // ========== DỪNG CÁC LISTENER ==========
        if (window.stopProgressRealtime) window.stopProgressRealtime();
        if (window.stopRealtimeListeners) window.stopRealtimeListeners();
        if (window.stopNotificationChecker) window.stopNotificationChecker();
        if (window.stopListeningNotifications) window.stopListeningNotifications();
        
        window.currentUser = null;
        window.currentUserData = null;
        sessionStorage.removeItem('currentUser');
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    });
}

// Tạo tài khoản demo tự động
window.createDemoAccounts = async function() {
    const demoAccounts = [
        { email: 'admin@demo.com', password: '123456', name: 'Admin', role: 'admin' },
        { email: 'nhanvien1@demo.com', password: '123456', name: 'Trần Thị B', role: 'staff' },
        { email: 'nhanvien2@demo.com', password: '123456', name: 'Lê Văn C', role: 'staff' },
        { email: 'nhanvien3@demo.com', password: '123456', name: 'Phạm Thị D', role: 'staff' },
        { email: 'nhanvien4@demo.com', password: '123456', name: 'Hoàng Văn E', role: 'staff' }
    ];
    for (const account of demoAccounts) {
        try {
            await window.firebaseSignInWithEmailAndPassword(account.email, account.password);
            await window.firebaseSignOut();
            console.log(`Account ${account.email} already exists`);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                try {
                    const userCredential = await window.firebaseCreateUserWithEmailAndPassword(account.email, account.password);
                    const userRef = window.firebaseRef(window.firebaseDb, `users/${userCredential.user.uid}`);
                    await window.firebaseSet(userRef, { uid: userCredential.user.uid, name: account.name, email: account.email, role: account.role, createdAt: new Date().toISOString() });
                    console.log(`Created demo account: ${account.email}`);
                } catch (createError) { console.error(`Error creating ${account.email}:`, createError); }
            }
        }
    }
};

// Lên lịch chạy task định kỳ
window.scheduleRecurringTasks = function() {
    console.log('Scheduling recurring tasks...');
    setTimeout(async () => {
        if (window.currentUser && window.companiesList && window.companiesList.length > 0 && window.generateRecurringTasks) {
            await window.generateRecurringTasks();
        }
    }, 3000);
    
    setInterval(async () => {
        const today = new Date();
        const lastRun = localStorage.getItem('lastRecurringRun');
        const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}`;
        if (lastRun !== todayKey) {
            console.log('New month detected, generating recurring tasks...');
            if (window.currentUser && window.companiesList && window.companiesList.length > 0 && window.generateRecurringTasks) {
                await window.generateRecurringTasks();
                localStorage.setItem('lastRecurringRun', todayKey);
            }
        }
    }, 24 * 60 * 60 * 1000);
};

// Kiểm tra session và auth state
window.firebaseOnAuthStateChanged(async (user) => {
    if (user) {
        const userRef = window.firebaseRef(window.firebaseDb, `users/${user.uid}`);
        const snapshot = await window.firebaseGet(userRef);
        let userData = snapshot.val();
        if (!userData) {
            userData = { uid: user.uid, name: user.email.split('@')[0], email: user.email, role: user.email.includes('admin') ? 'admin' : 'staff', createdAt: new Date().toISOString() };
            await window.firebaseSet(userRef, userData);
        }
        window.currentUser = user;
        window.currentUserData = userData;
        window.currentUserRole = userData.role;
        sessionStorage.setItem('currentUser', JSON.stringify({ uid: user.uid, name: userData.name, email: userData.email, role: userData.role }));
        
        const mainApp = document.getElementById('mainApp');
        if (mainApp && mainApp.classList.contains('hidden')) {
            document.getElementById('loginForm').classList.add('hidden');
            mainApp.classList.remove('hidden');
            document.getElementById('userName').textContent = userData.name;
            document.getElementById('userRole').textContent = userData.role === 'admin' ? 'Admin' : 'Nhân viên';
            
            // ========== PHÂN QUYỀN MENU ==========
            const dashboardBtn = document.getElementById('dashboardMenuBtn');
            const progressBtn = document.getElementById('progressMenuBtn');
            const usersBtn = document.getElementById('usersMenuBtn');
            
            if (userData.role === 'admin') {
                if (dashboardBtn) dashboardBtn.style.display = 'flex';
                if (progressBtn) progressBtn.style.display = 'none';
                if (usersBtn) usersBtn.style.display = 'flex';
            } else {
                if (dashboardBtn) dashboardBtn.style.display = 'none';
                if (progressBtn) progressBtn.style.display = 'flex';
                if (usersBtn) usersBtn.style.display = 'none';
            }
            
            if (window.loadAllData) await window.loadAllData();
            if (window.updateBadges) await window.updateBadges();
            if (window.renderDashboard) await window.renderDashboard();
            if (window.setupAppEventListeners) window.setupAppEventListeners();
            
            // ========== KHỞI TẠO REALTIME LISTENERS ==========
            if (window.initRealtimeListeners) {
                window.initRealtimeListeners();
            }
            
            // ========== KHỞI TẠO NOTIFICATION ==========
            if (window.requestNotificationPermission) {
                window.requestNotificationPermission();
            }
            if (window.startNotificationChecker) {
                window.startNotificationChecker();
            }
            if (window.listenForNotifications) {
                window.listenForNotifications();
            }
            if (window.loadUserNotifications) {
                await window.loadUserNotifications();
            }
            
            if (window.initProgressRealtime) window.initProgressRealtime();
            if (window.scheduleRecurringTasks) setTimeout(() => window.scheduleRecurringTasks(), 2000);
            
            if (userData.role === 'admin') {
                if (window.switchView) window.switchView('dashboard');
            } else {
                if (window.switchView) window.switchView('companies');
            }
        }
    }
});

// Tạo tài khoản demo khi khởi động
setTimeout(() => window.createDemoAccounts(), 1000);

console.log('Auth module with Firebase, Realtime & Notification loaded!');