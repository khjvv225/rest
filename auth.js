let phoneVerificationCode = null;

document.addEventListener('DOMContentLoaded', function() {
    setupAuthForms();
    setupGoogleLogin();
    setupPhoneLogin();
});

function setupAuthForms() {
    // Email login form
    const emailLoginForm = document.getElementById('emailLoginForm');
    if (emailLoginForm) {
        emailLoginForm.addEventListener('submit', handleEmailLogin);
    }
    
    // Email register form
    const emailRegisterForm = document.getElementById('emailRegisterForm');
    if (emailRegisterForm) {
        emailRegisterForm.addEventListener('submit', handleEmailRegister);
    }
    
    // Tab switching
    setupTabs();
}

function setupTabs() {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginTab && registerTab) {
        loginTab.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab('login');
        });
        
        registerTab.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab('register');
        });
    }
}

function switchTab(tabName) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (tabName === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    }
}

async function handleEmailLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        showAuthNotification('Muvaffaqiyatli kirdingiz!', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        let errorMessage = 'Login xatosi: ';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Bu email bilan foydalanuvchi topilmadi';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Parol noto\'g\'ri';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email manzili noto\'g\'ri formatda';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Bu akkaunt o\'chirilgan';
                break;
            default:
                errorMessage += error.message;
        }
        
        showAuthNotification(errorMessage, 'error');
    }
}

async function handleEmailRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    
    // Validation
    if (password.length < 6) {
        showAuthNotification('Parol kamida 6 ta belgidan iborat bo\'lishi kerak', 'error');
        return;
    }
    
    if (!phone.match(/^\+998[0-9]{9}$/)) {
        showAuthNotification('Telefon raqami noto\'g\'ri formatda (+998XXXXXXXXX)', 'error');
        return;
    }
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update user profile
        await user.updateProfile({
            displayName: name
        });
        
        // Save user data to Firebase Database
        await db.ref('users/' + user.uid).set({
            name: name,
            email: email,
            phone: phone,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        showAuthNotification('Muvaffaqiyatli ro\'yxatdan o\'tdingiz!', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        let errorMessage = 'Ro\'yxatdan o\'tish xatosi: ';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Bu email allaqachon ro\'yxatdan o\'tgan';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email manzili noto\'g\'ri formatda';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/parol autentifikatsiyasi amalga oshirilmaydi';
                break;
            case 'auth/weak-password':
                errorMessage = 'Parol juda oddiy, mustahkamroq parol tanlang';
                break;
            default:
                errorMessage += error.message;
        }
        
        showAuthNotification(errorMessage, 'error');
    }
}

function setupGoogleLogin() {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', handleGoogleLogin);
    }
}

async function handleGoogleLogin() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider
        ? new firebase.auth.GoogleAuthProvider()
        : null;
        
        if (!provider) {
            showAuthNotification('Google login hozir ishlamaydi. Qayta urinib ko\'ring.', 'error');
            return;
        }
        
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // Check if user exists in database
        const userSnapshot = await db.ref('users/' + user.uid).once('value');
        
        if (!userSnapshot.exists()) {
            // Save new user to database
            await db.ref('users/' + user.uid).set({
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                provider: 'google',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        showAuthNotification('Google orqali muvaffaqiyatli kirdingiz!', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        showAuthNotification('Google login xatosi: ' + error.message, 'error');
    }
}

function setupPhoneLogin() {
    const phoneLoginBtn = document.getElementById('phoneLoginBtn');
    const phoneModal = document.getElementById('phoneModal');
    const phoneSubmitBtn = document.getElementById('phoneSubmitBtn');
    
    if (phoneLoginBtn) {
        phoneLoginBtn.addEventListener('click', function() {
            phoneModal.style.display = 'block';
            initializeRecaptcha();
        });
    }
    
    if (phoneSubmitBtn) {
        phoneSubmitBtn.addEventListener('click', handlePhoneLogin);
    }
    
    // Close modal
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closePhoneModal);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === phoneModal) {
            closePhoneModal();
        }
    });
}

function initializeRecaptcha() {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            'size': 'normal',
            'callback': function(response) {
                console.log('reCAPTCHA solved');
            },
            'expired-callback': function() {
                showAuthNotification('reCAPTCHA muddati tugadi, qayta urinib ko\'ring', 'warning');
            }
        });
        
        window.recaptchaVerifier.render().then(function(widgetId) {
            window.recaptchaWidgetId = widgetId;
        });
    }
}

async function handlePhoneLogin() {
    const phoneNumber = document.getElementById('phoneInput').value;
    const verificationCodeInput = document.getElementById('verificationCodeInput');
    const verificationCode = document.getElementById('verificationCode').value;
    const phoneSubmitBtn = document.getElementById('phoneSubmitBtn');
    const phoneMessage = document.querySelector('.phone-modal-message');
    
    // Validate phone number format
    if (!phoneNumber.match(/^\+998[0-9]{9}$/)) {
        showAuthNotification('Iltimos, to\'g\'ri telefon raqamini kiriting (+998XXXXXXXXX)', 'error');
        return;
    }
    
    if (!phoneVerificationCode) {
        // Step 1: Send verification code
        try {
            const appVerifier = window.recaptchaVerifier;
            const confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, appVerifier);
            
            phoneVerificationCode = confirmationResult;
            
            // Show verification code input
            verificationCodeInput.style.display = 'block';
            phoneSubmitBtn.textContent = 'Tasdiqlash';
            phoneMessage.textContent = 'Telefoningizga yuborilgan kodni kiriting';
            phoneMessage.style.display = 'block';
            phoneMessage.style.color = '#28a745';
            
        } catch (error) {
            let errorMessage = 'SMS yuborish xatosi: ';
            
            switch (error.code) {
                case 'auth/invalid-phone-number':
                    errorMessage = 'Telefon raqami noto\'g\'ri formatda';
                    break;
                case 'auth/quota-exceeded':
                    errorMessage = 'SMS chegarasi oshib ketdi, keyinroq urinib ko\'ring';
                    break;
                case 'auth/captcha-check-failed':
                    errorMessage = 'reCAPTCHA tekshiruvi muvaffaqiyatsiz, qayta urinib ko\'ring';
                    break;
                default:
                    errorMessage += error.message;
            }
            
            showAuthNotification(errorMessage, 'error');
            
            // Reset reCAPTCHA
            if (window.recaptchaWidgetId) {
                window.grecaptcha.reset(window.recaptchaWidgetId);
            }
        }
    } else {
        // Step 2: Verify code
        try {
            const credential = await phoneVerificationCode.confirm(verificationCode);
            const user = credential.user;
            
            // Check if user exists in database
            const userSnapshot = await db.ref('users/' + user.uid).once('value');
            
            if (!userSnapshot.exists()) {
                // Save new user to database
                await db.ref('users/' + user.uid).set({
                    name: 'Foydalanuvchi',
                    phone: phoneNumber,
                    provider: 'phone',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            
            showAuthNotification('Telefon orqali muvaffaqiyatli kirdingiz!', 'success');
            
            setTimeout(() => {
                closePhoneModal();
                window.location.href = 'index.html';
            }, 1500);
            
        } catch (error) {
            showAuthNotification('Kod noto\'g\'ri yoki muddati tugagan', 'error');
        }
    }
}

function closePhoneModal() {
    const phoneModal = document.getElementById('phoneModal');
    phoneModal.style.display = 'none';
    
    // Reset form
    document.getElementById('phoneInput').value = '';
    document.getElementById('verificationCode').value = '';
    document.getElementById('verificationCodeInput').style.display = 'none';
    document.getElementById('phoneSubmitBtn').textContent = 'Kodni Yuborish';
    
    const phoneMessage = document.querySelector('.phone-modal-message');
    if (phoneMessage) {
        phoneMessage.style.display = 'none';
        phoneMessage.textContent = '';
    }
    
    phoneVerificationCode = null;
}

function showAuthNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.auth-notification');
    existingNotifications.forEach(notif => notif.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `auth-notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getAuthNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '8px';
    notification.style.color = 'white';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
    notification.style.animation = 'slideInRight 0.3s ease';
    
    // Set colors based on type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    notification.style.background = colors[type] || colors.info;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getAuthNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Logout function for auth pages
function logout() {
    auth.signOut().then(() => {
        showAuthNotification('Tizimdan chiqdingiz', 'info');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }).catch(error => {
        showAuthNotification('Chiqish xatosi: ' + error.message, 'error');
    });
}