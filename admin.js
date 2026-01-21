// Admin Panel JavaScript
let adminUser = null;
let currentFilter = 'all';
let editMode = false;
let currentEditId = null;

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    initAdminPanel();
    setupEventListeners();
    checkAdminAuth();
});

// Initialize Admin Panel
function initAdminPanel() {
    // Check if admin is logged in
    const adminEmail = localStorage.getItem('adminEmail');
    const loginTime = localStorage.getItem('adminLoginTime');
    
    if (adminEmail === 'admin@bukhararest.uz' && loginTime) {
        // Check if session is expired (24 hours)
        const loginDate = new Date(loginTime);
        const now = new Date();
        const hoursDiff = (now - loginDate) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
            showAdminPanel();
            updateLoginTime();
            loadAllData();
        } else {
            logoutAdmin();
            showNotification('Sessiya muddati tugadi. Qaytadan kiring.', 'warning');
        }
    } else {
        showLoginForm();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Login Form
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }
    
    // Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleAdminLogout);
    }
    
    // Menu Form
    const menuForm = document.getElementById('addMenuForm');
    if (menuForm) {
        menuForm.addEventListener('submit', handleMenuFormSubmit);
    }
    
    // Settings Form
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSettingsSubmit);
    }
    
    // Search Input
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', handleUserSearch);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const activeSection = document.querySelector('.admin-section.active');
            if (activeSection && activeSection.id === 'menuSection' && editMode) {
                const form = document.getElementById('addMenuForm');
                if (form) form.requestSubmit();
            } else if (activeSection && activeSection.id === 'settingsSection') {
                const form = document.getElementById('settingsForm');
                if (form) form.requestSubmit();
            }
        }
        
        // ESC to close modals
        if (e.key === 'Escape') {
            closeModal();
            hideAddMenuForm();
        }
    });
}

// ============ AUTHENTICATION ============

function checkAdminAuth() {
    const adminEmail = localStorage.getItem('adminEmail');
    if (!adminEmail || adminEmail !== 'admin@bukhararest.uz') {
        showLoginForm();
        return false;
    }
    return true;
}

function handleAdminLogin(e) {
    e.preventDefault();
    showLoading();
    
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    
    // Simple validation (in production, use proper backend authentication)
    if (email === 'admin@bukhararest.uz' && password === 'admin123') {
        // Simulate API call delay
        setTimeout(() => {
            localStorage.setItem('adminEmail', email);
            localStorage.setItem('adminLoginTime', new Date().toISOString());
            
            hideLoading();
            showAdminPanel();
            showNotification('Xush kelibsiz, Administrator!', 'success');
            logActivity('Tizimga kirdi');
        }, 1000);
    } else {
        hideLoading();
        showNotification('Email yoki parol noto\'g\'ri!', 'error');
    }
}

function handleAdminLogout() {
    if (confirm('Admin paneldan chiqishni istaysizmi?')) {
        logoutAdmin();
        showNotification('Tizimdan chiqdingiz', 'info');
    }
}

function logoutAdmin() {
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminLoginTime');
    showLoginForm();
}

function updateLoginTime() {
    const loginTime = new Date().toISOString();
    localStorage.setItem('adminLoginTime', loginTime);
    
    // Update display
    const loginTimeElement = document.getElementById('adminLoginTime');
    if (loginTimeElement) {
        const date = new Date(loginTime);
        loginTimeElement.textContent = date.toLocaleString('uz-UZ');
    }
}

// ============ VIEW MANAGEMENT ============

function showLoginForm() {
    const loginDiv = document.getElementById('adminLoginDiv');
    const panelDiv = document.getElementById('adminPanelDiv');
    
    if (loginDiv) loginDiv.style.display = 'flex';
    if (panelDiv) panelDiv.style.display = 'none';
    
    // Clear form
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.reset();
    }
}

function showAdminPanel() {
    const loginDiv = document.getElementById('adminLoginDiv');
    const panelDiv = document.getElementById('adminPanelDiv');
    
    if (loginDiv) loginDiv.style.display = 'none';
    if (panelDiv) panelDiv.style.display = 'block';
    
    // Update login time display
    updateLoginTime();
}

function showAdminSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all menu items
    const menuItems = document.querySelectorAll('.admin-menu a');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Add active class to clicked menu item
        event.target.classList.add('active');
        
        // Load section data
        switch(sectionId) {
            case 'dashboard':
                loadDashboardStats();
                loadRecentActivity();
                break;
            case 'users':
                loadUsersList();
                break;
            case 'bookings':
                loadBookingsList();
                break;
            case 'menu':
                loadMenuItems();
                break;
            case 'messages':
                loadMessages();
                break;
            case 'settings':
                loadSettings();
                break;
        }
    }
}

// ============ DATA LOADING ============

function loadAllData() {
    showLoading();
    
    Promise.all([
        loadDashboardStats(),
        loadUsersList(),
        loadBookingsList(),
        loadMenuItems(),
        loadMessages(),
        loadSettings()
    ])
    .then(() => {
        hideLoading();
        showNotification('Barcha ma\'lumotlar yuklandi', 'success');
    })
    .catch(error => {
        hideLoading();
        showNotification('Ma\'lumotlarni yuklashda xatolik: ' + error.message, 'error');
    });
}

function refreshDashboard() {
    loadDashboardStats();
    loadRecentActivity();
    showNotification('Dashboard yangilandi', 'info');
}

async function loadDashboardStats() {
    try {
        const [usersSnapshot, bookingsSnapshot, menuSnapshot] = await Promise.all([
            db.ref('users').once('value'),
            db.ref('bookings').once('value'),
            db.ref('menu').once('value')
        ]);
        
        const users = usersSnapshot.val() || {};
        const bookings = bookingsSnapshot.val() || {};
        const menu = menuSnapshot.val() || {};
        const today = new Date().toISOString().split('T')[0];
        
        // Calculate today's bookings
        let todayCount = 0;
        Object.values(bookings).forEach(booking => {
            if (booking.date === today) {
                todayCount++;
            }
        });
        
        // Update stats
        const totalUsersElem = document.getElementById('totalUsers');
        const todayBookingsElem = document.getElementById('todayBookings');
        const totalBookingsElem = document.getElementById('totalBookings');
        const totalMenuItemsElem = document.getElementById('totalMenuItems');
        
        if (totalUsersElem) totalUsersElem.textContent = Object.keys(users).length;
        if (todayBookingsElem) todayBookingsElem.textContent = todayCount;
        if (totalBookingsElem) totalBookingsElem.textContent = Object.keys(bookings).length;
        if (totalMenuItemsElem) totalMenuItemsElem.textContent = Object.keys(menu).length;
        
    } catch (error) {
        console.error('Dashboard stats error:', error);
        showNotification('Statistikani yuklashda xatolik', 'error');
    }
}

async function loadRecentActivity() {
    try {
        const bookingsSnapshot = await db.ref('bookings').orderByChild('createdAt').limitToLast(5).once('value');
        const bookings = bookingsSnapshot.val() || {};
        
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        activityList.innerHTML = '';
        
        Object.entries(bookings).forEach(([id, booking]) => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            
            const timeAgo = getTimeAgo(booking.createdAt);
            
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="fas fa-calendar-plus"></i>
                </div>
                <div class="activity-content">
                    <p><strong>${booking.userName || 'N/A'}</strong> yangi bron qildi</p>
                    <small>${timeAgo} • ${booking.date} ${booking.time}</small>
                </div>
            `;
            
            activityList.appendChild(activityItem);
        });
        
    } catch (error) {
        console.error('Recent activity error:', error);
    }
}

async function loadUsersList() {
    try {
        const usersSnapshot = await db.ref('users').once('value');
        const users = usersSnapshot.val() || {};
        const usersTableBody = document.getElementById('usersTableBody');
        
        if (!usersTableBody) return;
        
        usersTableBody.innerHTML = '';
        
        Object.entries(users).forEach(([id, user]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${id.substring(0, 8)}...</td>
                <td>${user.name || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>${user.createdAt ? formatDate(user.createdAt) : 'N/A'}</td>
                <td>
                    <div class="action-buttons">
                        <button onclick="viewUserDetails('${id}')" class="btn-small btn-info">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="deleteUser('${id}')" class="btn-small btn-danger">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            usersTableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Users list error:', error);
        showNotification('Foydalanuvchilarni yuklashda xatolik', 'error');
    }
}

async function loadBookingsList(filter = 'all') {
    try {
        const bookingsSnapshot = await db.ref('bookings').once('value');
        let bookings = bookingsSnapshot.val() || {};
        
        // Apply filter
        if (filter !== 'all') {
            bookings = Object.fromEntries(
                Object.entries(bookings).filter(([id, booking]) => booking.status === filter)
            );
        }
        
        const bookingsTableBody = document.getElementById('bookingsTableBody');
        if (!bookingsTableBody) return;
        
        bookingsTableBody.innerHTML = '';
        
        Object.entries(bookings).forEach(([id, booking]) => {
            const statusClass = getStatusClass(booking.status);
            const statusText = getStatusText(booking.status);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${id.substring(0, 8)}...</td>
                <td>${booking.userName || 'N/A'}</td>
                <td>${booking.phone || 'N/A'}</td>
                <td>${booking.date || 'N/A'}</td>
                <td>${booking.time || 'N/A'}</td>
                <td>${booking.guests || 'N/A'}</td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        ${booking.status === 'pending' ? 
                            `<button onclick="updateBookingStatus('${id}', 'confirmed')" class="btn-small btn-success">
                                <i class="fas fa-check"></i>
                            </button>` : ''}
                        <button onclick="viewBookingDetails('${id}')" class="btn-small btn-info">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="deleteBooking('${id}')" class="btn-small btn-danger">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            bookingsTableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Bookings list error:', error);
        showNotification('Bronlarni yuklashda xatolik', 'error');
    }
}

function filterBookings(status) {
    currentFilter = status;
    
    // Update filter buttons
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadBookingsList(status);
}

async function loadMenuItems() {
    try {
        const menuSnapshot = await db.ref('menu').once('value');
        const menu = menuSnapshot.val() || {};
        const menuTableBody = document.getElementById('menuTableBody');
        
        if (!menuTableBody) return;
        
        menuTableBody.innerHTML = '';
        
        Object.entries(menu).forEach(([id, item]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="menu-item-preview">
                        <img src="${item.image || 'https://via.placeholder.com/50x50?text=Taom'}" 
                             alt="${item.name}" 
                             onerror="this.src='https://via.placeholder.com/50x50?text=Taom'">
                        <div>
                            <strong>${item.name}</strong>
                            <br>
                            <small>${item.category}</small>
                        </div>
                    </div>
                </td>
                <td>${getCategoryText(item.category)}</td>
                <td>${item.price ? item.price.toLocaleString('uz-UZ') + ' so\'m' : 'N/A'}</td>
                <td>${item.description ? (item.description.substring(0, 50) + (item.description.length > 50 ? '...' : '')) : 'N/A'}</td>
                <td>
                    <div class="action-buttons">
                        <button onclick="editMenuItem('${id}')" class="btn-small btn-primary">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteMenuItem('${id}')" class="btn-small btn-danger">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            menuTableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Menu items error:', error);
        showNotification('Menyu elementlarini yuklashda xatolik', 'error');
    }
}

async function loadMessages() {
    try {
        const messagesSnapshot = await db.ref('messages').orderByChild('createdAt').limitToLast(20).once('value');
        const messages = messagesSnapshot.val() || {};
        const messagesList = document.getElementById('messagesList');
        
        if (!messagesList) return;
        
        messagesList.innerHTML = '';
        
        Object.entries(messages).forEach(([id, message]) => {
            const messageElement = document.createElement('div');
            messageElement.className = 'message-item';
            
            const timeAgo = getTimeAgo(message.createdAt);
            
            messageElement.innerHTML = `
                <div class="message-header">
                    <div>
                        <strong>${message.name}</strong>
                        <small>${message.email}</small>
                    </div>
                    <span class="message-time">${timeAgo}</span>
                </div>
                <div class="message-content">
                    <p>${message.message}</p>
                </div>
                <div class="message-actions">
                    <button onclick="replyToMessage('${id}', '${message.email}')" class="btn-small btn-primary">
                        <i class="fas fa-reply"></i> Javob berish
                    </button>
                    <button onclick="deleteMessage('${id}')" class="btn-small btn-danger">
                        <i class="fas fa-trash"></i> O'chirish
                    </button>
                </div>
            `;
            
            messagesList.appendChild(messageElement);
        });
        
    } catch (error) {
        console.error('Messages error:', error);
        showNotification('Xabarlarni yuklashda xatolik', 'error');
    }
}

async function loadSettings() {
    try {
        const settingsSnapshot = await db.ref('settings').once('value');
        const settings = settingsSnapshot.val() || {};
        
        // Set default values if not exists
        const defaultSettings = {
            restaurantName: 'BUKHARA REST',
            restaurantPhone: '+998 90 123 45 67',
            restaurantEmail: 'info@bukhararest.uz',
            restaurantAddress: 'Buxoro shahri, Markaziy ko\'cha 123',
            restaurantDescription: 'O\'zbek milliy taomlarining eng yaxshi namunalari',
            workingHours: 'Har kuni 9:00 - 23:00'
        };
        
        const mergedSettings = { ...defaultSettings, ...settings };
        
        // Populate form
        const restaurantNameElem = document.getElementById('restaurantName');
        const restaurantPhoneElem = document.getElementById('restaurantPhone');
        const restaurantEmailElem = document.getElementById('restaurantEmail');
        const restaurantAddressElem = document.getElementById('restaurantAddress');
        const restaurantDescriptionElem = document.getElementById('restaurantDescription');
        const workingHoursElem = document.getElementById('workingHours');
        
        if (restaurantNameElem) restaurantNameElem.value = mergedSettings.restaurantName;
        if (restaurantPhoneElem) restaurantPhoneElem.value = mergedSettings.restaurantPhone;
        if (restaurantEmailElem) restaurantEmailElem.value = mergedSettings.restaurantEmail;
        if (restaurantAddressElem) restaurantAddressElem.value = mergedSettings.restaurantAddress;
        if (restaurantDescriptionElem) restaurantDescriptionElem.value = mergedSettings.restaurantDescription;
        if (workingHoursElem) workingHoursElem.value = mergedSettings.workingHours;
        
    } catch (error) {
        console.error('Settings error:', error);
        showNotification('Sozlamalarni yuklashda xatolik', 'error');
    }
}

// ============ CRUD OPERATIONS ============

// MENU OPERATIONS
function showAddMenuForm() {
    editMode = false;
    currentEditId = null;
    
    const addMenuFormDiv = document.getElementById('addMenuFormDiv');
    const addMenuForm = document.getElementById('addMenuForm');
    const formHeader = document.querySelector('#addMenuFormDiv .form-header h3');
    const submitBtn = document.querySelector('#addMenuForm button[type="submit"]');
    
    if (addMenuFormDiv) addMenuFormDiv.style.display = 'block';
    if (addMenuForm) addMenuForm.reset();
    
    // Set form title
    if (formHeader) {
        formHeader.innerHTML = '<i class="fas fa-hamburger"></i> Yangi Taom Qo\'shish';
    }
    
    // Set submit button text
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Saqlash';
    }
}

function hideAddMenuForm() {
    const addMenuFormDiv = document.getElementById('addMenuFormDiv');
    if (addMenuFormDiv) addMenuFormDiv.style.display = 'none';
    editMode = false;
    currentEditId = null;
}

async function handleMenuFormSubmit(e) {
    e.preventDefault();
    showLoading();
    
    const menuItem = {
        name: document.getElementById('menuName').value.trim(),
        category: document.getElementById('menuCategory').value,
        price: parseInt(document.getElementById('menuPrice').value) || 0,
        description: document.getElementById('menuDescription').value.trim(),
        image: document.getElementById('menuImage').value.trim() || 
               'https://via.placeholder.com/400x300?text=Taom+Rasm',
        updatedAt: new Date().toISOString()
    };
    
    try {
        if (editMode && currentEditId) {
            // Update existing item
            await db.ref('menu/' + currentEditId).update(menuItem);
            showNotification('Taom muvaffaqiyatli yangilandi!', 'success');
            logActivity(`"${menuItem.name}" taomini yangiladi`);
        } else {
            // Add new item
            menuItem.id = Date.now().toString();
            menuItem.createdAt = new Date().toISOString();
            await db.ref('menu/' + menuItem.id).set(menuItem);
            showNotification('Taom muvaffaqiyatli qo\'shildi!', 'success');
            logActivity(`"${menuItem.name}" taomini qo'shadi`);
        }
        
        hideAddMenuForm();
        await loadMenuItems();
        await loadDashboardStats();
        hideLoading();
        
    } catch (error) {
        hideLoading();
        showNotification('Xatolik: ' + error.message, 'error');
    }
}

async function editMenuItem(menuId) {
    try {
        showLoading();
        const snapshot = await db.ref('menu/' + menuId).once('value');
        const item = snapshot.val();
        
        if (item) {
            editMode = true;
            currentEditId = menuId;
            
            // Populate form
            document.getElementById('menuName').value = item.name || '';
            document.getElementById('menuCategory').value = item.category || '';
            document.getElementById('menuPrice').value = item.price || '';
            document.getElementById('menuDescription').value = item.description || '';
            document.getElementById('menuImage').value = item.image || '';
            
            // Update form title
            const formHeader = document.querySelector('#addMenuFormDiv .form-header h3');
            if (formHeader) {
                formHeader.innerHTML = `<i class="fas fa-edit"></i> "${item.name}" ni Tahrirlash`;
            }
            
            // Show form
            const addMenuFormDiv = document.getElementById('addMenuFormDiv');
            if (addMenuFormDiv) {
                addMenuFormDiv.style.display = 'block';
                // Scroll to form
                addMenuFormDiv.scrollIntoView({ behavior: 'smooth' });
            }
        }
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        showNotification('Xatolik: ' + error.message, 'error');
    }
}

async function deleteMenuItem(menuId) {
    if (confirm('Haqiqatan ham bu taomni o\'chirib tashlamoqchimisiz?')) {
        showLoading();
        try {
            const snapshot = await db.ref('menu/' + menuId).once('value');
            const item = snapshot.val();
            
            await db.ref('menu/' + menuId).remove();
            await loadMenuItems();
            await loadDashboardStats();
            hideLoading();
            
            showNotification('Taom o\'chirildi!', 'success');
            if (item) {
                logActivity(`"${item.name}" taomini o'chiradi`);
            }
            
        } catch (error) {
            hideLoading();
            showNotification('Xatolik: ' + error.message, 'error');
        }
    }
}

// BOOKING OPERATIONS
async function updateBookingStatus(bookingId, status) {
    if (confirm('Bron holatini yangilaysizmi?')) {
        showLoading();
        try {
            await db.ref('bookings/' + bookingId).update({ 
                status: status,
                updatedAt: new Date().toISOString()
            });
            
            await loadBookingsList(currentFilter);
            await loadDashboardStats();
            hideLoading();
            
            const statusText = getStatusText(status);
            showNotification(`Bron holati "${statusText}" ga o'zgartirildi!`, 'success');
            logActivity(`Bron holatini "${statusText}" ga o'zgartiradi`);
            
        } catch (error) {
            hideLoading();
            showNotification('Xatolik: ' + error.message, 'error');
        }
    }
}

async function deleteBooking(bookingId) {
    if (confirm('Haqiqatan ham bu bronni o\'chirib tashlamoqchimisiz?')) {
        showLoading();
        try {
            const snapshot = await db.ref('bookings/' + bookingId).once('value');
            const booking = snapshot.val();
            
            await db.ref('bookings/' + bookingId).remove();
            await loadBookingsList(currentFilter);
            await loadDashboardStats();
            hideLoading();
            
            showNotification('Bron o\'chirildi!', 'success');
            if (booking) {
                logActivity(`"${booking.userName}" bronini o'chiradi`);
            }
            
        } catch (error) {
            hideLoading();
            showNotification('Xatolik: ' + error.message, 'error');
        }
    }
}

async function viewBookingDetails(bookingId) {
    try {
        const snapshot = await db.ref('bookings/' + bookingId).once('value');
        const booking = snapshot.val();
        
        if (booking) {
            const modalBody = document.getElementById('modalBody');
            const statusClass = getStatusClass(booking.status);
            const statusText = getStatusText(booking.status);
            
            if (modalBody) {
                modalBody.innerHTML = `
                    <div class="modal-header">
                        <h3><i class="fas fa-calendar-check"></i> Bron Ma'lumotlari</h3>
                    </div>
                    
                    <div class="booking-details">
                        <div class="detail-row">
                            <span class="detail-label">Ism:</span>
                            <span class="detail-value">${booking.userName || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Telefon:</span>
                            <span class="detail-value">${booking.phone || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${booking.email || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Sana:</span>
                            <span class="detail-value">${booking.date || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Vaqt:</span>
                            <span class="detail-value">${booking.time || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Mehmonlar:</span>
                            <span class="detail-value">${booking.guests || 'N/A'} kishi</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Holat:</span>
                            <span class="detail-value">
                                <span class="status-badge ${statusClass}">${statusText}</span>
                            </span>
                        </div>
                        ${booking.notes ? `
                        <div class="detail-row">
                            <span class="detail-label">Qo'shimcha:</span>
                            <span class="detail-value">${booking.notes}</span>
                        </div>` : ''}
                        <div class="detail-row">
                            <span class="detail-label">Bron vaqti:</span>
                            <span class="detail-value">${formatDateTime(booking.createdAt)}</span>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        ${booking.status !== 'confirmed' ? 
                            `<button onclick="updateBookingStatus('${bookingId}', 'confirmed')" class="btn-primary">
                                <i class="fas fa-check"></i> Tasdiqlash
                            </button>` : ''}
                        <button onclick="closeModal()" class="btn-secondary">Yopish</button>
                    </div>
                `;
                
                openModal();
            }
        }
        
    } catch (error) {
        showNotification('Bron ma\'lumotlarini yuklashda xatolik', 'error');
    }
}

// USER OPERATIONS
async function viewUserDetails(userId) {
    try {
        const snapshot = await db.ref('users/' + userId).once('value');
        const user = snapshot.val();
        
        if (user) {
            const modalBody = document.getElementById('modalBody');
            
            if (modalBody) {
                modalBody.innerHTML = `
                    <div class="modal-header">
                        <h3><i class="fas fa-user"></i> Foydalanuvchi Ma'lumotlari</h3>
                    </div>
                    
                    <div class="user-details">
                        <div class="detail-row">
                            <span class="detail-label">Ism:</span>
                            <span class="detail-value">${user.name || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${user.email || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Telefon:</span>
                            <span class="detail-value">${user.phone || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Ro'yxatdan o'tish:</span>
                            <span class="detail-value">${formatDateTime(user.createdAt)}</span>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button onclick="closeModal()" class="btn-secondary">Yopish</button>
                    </div>
                `;
                
                openModal();
            }
        }
        
    } catch (error) {
        showNotification('Foydalanuvchi ma\'lumotlarini yuklashda xatolik', 'error');
    }
}

async function deleteUser(userId) {
    if (confirm('Haqiqatan ham bu foydalanuvchini o\'chirib tashlamoqchimisiz?')) {
        showLoading();
        try {
            const snapshot = await db.ref('users/' + userId).once('value');
            const user = snapshot.val();
            
            await db.ref('users/' + userId).remove();
            await loadUsersList();
            await loadDashboardStats();
            hideLoading();
            
            showNotification('Foydalanuvchi o\'chirildi!', 'success');
            if (user) {
                logActivity(`"${user.name}" foydalanuvchisini o'chiradi`);
            }
            
        } catch (error) {
            hideLoading();
            showNotification('Xatolik: ' + error.message, 'error');
        }
    }
}

// MESSAGE OPERATIONS
function replyToMessage(messageId, email) {
    const subject = encodeURIComponent('BUKHARA REST - Javob');
    const body = encodeURIComponent('Hurmatli mijoz,\n\nSizning xabaringizga javob:\n\n');
    
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
}

async function deleteMessage(messageId) {
    if (confirm('Haqiqatan ham bu xabarni o\'chirib tashlamoqchimisiz?')) {
        showLoading();
        try {
            await db.ref('messages/' + messageId).remove();
            await loadMessages();
            hideLoading();
            
            showNotification('Xabar o\'chirildi!', 'success');
            logActivity('Xabar o\'chiradi');
            
        } catch (error) {
            hideLoading();
            showNotification('Xatolik: ' + error.message, 'error');
        }
    }
}

// SETTINGS OPERATIONS
async function handleSettingsSubmit(e) {
    e.preventDefault();
    showLoading();
    
    const settingsData = {
        restaurantName: document.getElementById('restaurantName').value.trim(),
        restaurantPhone: document.getElementById('restaurantPhone').value.trim(),
        restaurantEmail: document.getElementById('restaurantEmail').value.trim(),
        restaurantAddress: document.getElementById('restaurantAddress').value.trim(),
        restaurantDescription: document.getElementById('restaurantDescription').value.trim(),
        workingHours: document.getElementById('workingHours').value.trim(),
        updatedAt: new Date().toISOString()
    };
    
    // Check if password should be changed
    const newPassword = document.getElementById('adminPasswordChange');
    if (newPassword && newPassword.value.trim()) {
        const newPass = newPassword.value.trim();
        if (newPass.length < 6) {
            hideLoading();
            showNotification('Parol kamida 6 ta belgidan iborat bo\'lishi kerak', 'error');
            return;
        }
        // In production, this would be handled by a backend API
        // For now, we'll just show a message
        showNotification('Parol o\'zgartirish backend API orqali amalga oshiriladi', 'info');
    }
    
    try {
        await db.ref('settings').set(settingsData);
        hideLoading();
        showNotification('Sozlamalar saqlandi!', 'success');
        logActivity('Sozlamalarni yangiladi');
        
        // Clear password field
        if (newPassword) newPassword.value = '';
        
    } catch (error) {
        hideLoading();
        showNotification('Xatolik: ' + error.message, 'error');
    }
}

function resetSettings() {
    if (confirm('Sozlamalarni asl holatiga qaytarasizmi?')) {
        loadSettings();
        showNotification('Sozlamalar qayta yuklandi', 'info');
    }
}

// ============ UTILITY FUNCTIONS ============

function handleUserSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#usersTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function openModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) modalOverlay.style.display = 'flex';
}

function closeModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) modalOverlay.style.display = 'none';
}

function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        // Create notification container if it doesn't exist
        const newContainer = document.createElement('div');
        newContainer.id = 'notificationContainer';
        newContainer.style.position = 'fixed';
        newContainer.style.top = '20px';
        newContainer.style.right = '20px';
        newContainer.style.zIndex = '9999';
        document.body.appendChild(newContainer);
        container = newContainer;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getStatusClass(status) {
    const statusMap = {
        'pending': 'status-pending',
        'confirmed': 'status-confirmed',
        'cancelled': 'status-cancelled'
    };
    return statusMap[status] || 'status-pending';
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Kutilmoqda',
        'confirmed': 'Tasdiqlangan',
        'cancelled': 'Bekor qilingan'
    };
    return statusMap[status] || status;
}

function getCategoryText(category) {
    const categoryMap = {
        'main': 'Asosiy Taom',
        'appetizer': 'Ochildi',
        'dessert': 'Shirinlik',
        'drink': 'Ichimlik'
    };
    return categoryMap[category] || category;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('uz-UZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return 'N/A';
    }
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('uz-UZ', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return 'N/A';
    }
}

function getTimeAgo(dateString) {
    if (!dateString) return 'Vaqt noma\'lum';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) return interval + ' yil oldin';
        
        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) return interval + ' oy oldin';
        
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) return interval + ' kun oldin';
        
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) return interval + ' soat oldin';
        
        interval = Math.floor(seconds / 60);
        if (interval >= 1) return interval + ' daqiqa oldin';
        
        return 'Hozirgina';
    } catch (e) {
        return 'Vaqt noma\'lum';
    }
}

function logActivity(description) {
    // In production, you would save this to Firebase
    console.log(`[Activity] ${description} - ${new Date().toLocaleString()}`);
}

// Global functions for onclick events
window.showAddMenuForm = showAddMenuForm;
window.hideAddMenuForm = hideAddMenuForm;
window.editMenuItem = editMenuItem;
window.deleteMenuItem = deleteMenuItem;
window.updateBookingStatus = updateBookingStatus;
window.deleteBooking = deleteBooking;
window.viewBookingDetails = viewBookingDetails;
window.viewUserDetails = viewUserDetails;
window.deleteUser = deleteUser;
window.replyToMessage = replyToMessage;
window.deleteMessage = deleteMessage;
window.resetSettings = resetSettings;
window.filterBookings = filterBookings;
window.showAdminSection = showAdminSection;
window.refreshDashboard = refreshDashboard;
window.closeModal = closeModal;

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.id === 'modalOverlay') {
        closeModal();
    }
});

// Close modals with ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
        hideAddMenuForm();
    }
});

// Auto-refresh dashboard every 5 minutes
setInterval(() => {
    if (document.querySelector('#dashboardSection.active')) {
        loadDashboardStats();
    }
}, 300000); // 5 minutes
