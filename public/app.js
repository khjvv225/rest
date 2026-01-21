// Dynamic API base URL for deployment/local
const BASE_API_URL = window.API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');

// Menu data from backend
let defaultMenu = [];

let currentUser = null;
let currentFilter = 'all';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadMenu();
    loadBookings();
    setupFormHandlers();
    checkUserAuth();
    setupMobileMenu();
});

// Check if user is logged in (JWT localStorage)
function checkUserAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        // Optionally decode token for user info
        document.querySelector('.btn-login').innerHTML = `<i class="fas fa-user"></i> Profil`;
        document.querySelector('.btn-login').href = 'profile.html';
        currentUser = { token };
    } else {
        currentUser = null;
    }
}

// Setup mobile menu
function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function() {
            const isDisplayed = navLinks.style.display === 'flex';
            navLinks.style.display = isDisplayed ? 'none' : 'flex';
            
            // Adjust for mobile
            if (window.innerWidth <= 768) {
                if (!isDisplayed) {
                    navLinks.style.flexDirection = 'column';
                    navLinks.style.position = 'absolute';
                    navLinks.style.top = '100%';
                    navLinks.style.left = '0';
                    navLinks.style.right = '0';
                    navLinks.style.background = 'white';
                    navLinks.style.padding = '20px';
                    navLinks.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                    navLinks.style.gap = '15px';
                }
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.style.display = 'none';
            }
        });
    }
}

// Load Menu
async function loadMenu(filter = 'all') {
    currentFilter = filter;
    const menuGrid = document.getElementById('menuGrid');
    if (!menuGrid) return;

    menuGrid.innerHTML = '';

    try {
        const res = await fetch(BASE_API_URL + '/api/public/menu');
        const data = await res.json();
        if (data.success && Array.isArray(data.menu)) {
            defaultMenu = data.menu;
        } else {
            defaultMenu = [];
        }
    } catch (e) {
        defaultMenu = [];
    }

    let filteredMenu = defaultMenu;
    if (filter !== 'all') {
        filteredMenu = defaultMenu.filter(item => item.category === filter);
    }

    filteredMenu.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.innerHTML = `
            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/400x300?text=${item.name}'">
            <div class="menu-card-content">
                <h3 class="menu-card-name">${item.name}</h3>
                <p>${item.description}</p>
                <span class="menu-card-price">${item.price?.toLocaleString('uz-UZ') || ''} so'm</span>
            </div>
        `;
        menuGrid.appendChild(card);
    });
}

// Filter Menu
function filterMenu(category) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadMenu(category);
}


// Load Bookings from backend (admin only, placeholder)
function loadBookings() {
    // TODO: Implement admin booking list fetch from backend if needed
    // fetch('/api/bookings', { headers: { Authorization: 'Bearer ...' } })
    //   .then(res => res.json())
    //   .then(data => { ... });
}

// Setup Form Handlers
function setupFormHandlers() {
    // Booking Form
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmit);
    }

    // Contact Form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }
    
    // Login Form
    const loginForm = document.getElementById('emailLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleEmailLogin);
    }
    
    // Register Form
    const registerForm = document.getElementById('emailRegisterForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleEmailRegister);
    }
}

// Handle Email Login (backend)
async function handleEmailLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const res = await fetch(BASE_API_URL + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success && data.token) {
            localStorage.setItem('token', data.token);
            showNotification('Muvaffaqiyatli kirdingiz!', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showNotification('Login xatosi: ' + (data.message || 'Login xatosi'), 'error');
        }
    } catch (error) {
        showNotification('Login xatosi: ' + error.message, 'error');
    }
}

// Handle Email Registration (backend)
async function handleEmailRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    try {
        const res = await fetch(BASE_API_URL + '/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });
        const data = await res.json();
        if (data.success && data.token) {
            localStorage.setItem('token', data.token);
            showNotification('Muvaffaqiyatli ro\'yxatdan o\'tdingiz!', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showNotification('Ro\'yxatdan o\'tish xatosi: ' + (data.message || 'Xatolik'), 'error');
        }
    } catch (error) {
        showNotification('Ro\'yxatdan o\'tish xatosi: ' + error.message, 'error');
    }
}

// Handle Booking Submission (to backend)
async function handleBookingSubmit(e) {
    e.preventDefault();

    // Collect booking data from form
    const booking = {
        userName: document.getElementById('guestName').value,
        email: document.getElementById('guestEmail').value,
        phone: document.getElementById('guestPhone').value,
        date: document.getElementById('bookingDate').value,
        time: document.getElementById('bookingTime').value,
        guests: parseInt(document.getElementById('guestCount').value),
        notes: document.getElementById('guestNotes').value
    };

    try {
        const res = await fetch(BASE_API_URL + '/api/public/booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(booking)
        });
        const data = await res.json();
        if (data.success) {
            showNotification('Broningiz muvaffaqiyatli qabul qilindi!', 'success');
            document.getElementById('bookingForm').reset();
        } else {
            showNotification('Xatolik: ' + (data.message || 'Bron qilishda xatolik'), 'error');
        }
    } catch (error) {
        showNotification('Xatolik: ' + error.message, 'error');
    }
}

// Handle Contact Submission (to backend)
async function handleContactSubmit(e) {
    e.preventDefault();

    const message = {
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        message: document.getElementById('contactMessage').value
    };

    try {
        const res = await fetch(BASE_API_URL + '/api/public/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });
        const data = await res.json();
        if (data.success) {
            showNotification('Xabaringiz yuborildi! Tez orada siz bilan bog\'lanamiz.', 'success');
            document.getElementById('contactForm').reset();
        } else {
            showNotification('Xatolik: ' + (data.message || 'Xabar yuborishda xatolik'), 'error');
        }
    } catch (error) {
        showNotification('Xatolik: ' + error.message, 'error');
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Position notification
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    
    // Remove after 5 seconds
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

// Logout function (JWT)
function logout() {
    localStorage.removeItem('token');
    showNotification('Tizimdan chiqdingiz', 'info');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

// Handle window resize for mobile menu
window.addEventListener('resize', function() {
    const navLinks = document.querySelector('.nav-links');
    if (window.innerWidth > 768 && navLinks) {
        navLinks.style.display = 'flex';
        navLinks.style.flexDirection = 'row';
        navLinks.style.position = 'static';
        navLinks.style.background = 'transparent';
        navLinks.style.padding = '0';
        navLinks.style.boxShadow = 'none';
    } else if (window.innerWidth <= 768 && navLinks) {
        navLinks.style.display = 'none';
    }
});