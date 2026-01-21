// BUKHARA REST - Frontend JS
// Menu rendering, booking, contact, auth, profile, admin
// Firebase config is loaded from config.js

// Default menu data
const menuItems = [
    { id: 1, name: "Manti", category: "main", price: 35000, description: "O'zbek milliy taomi - go'sht bilan to'ldirilgan manti", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop" },
    { id: 2, name: "Palov", category: "main", price: 30000, description: "Aromatic go'sht va sholi bilan tayyorlangan palov", image: "https://images.unsplash.com/photo-1585521537556-0dadc4c32df9?w=400&h=300&fit=crop" },
    { id: 3, name: "Shurva", category: "main", price: 25000, description: "Zamonaviy go'sht va sabzavotlar bilan pishirilgan shurva", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop" },
    { id: 4, name: "Somsa", category: "appetizer", price: 12000, description: "Tuxum va go'sht bilan to'ldirilgan crispy somsa", image: "https://images.unsplash.com/photo-1629452333337-aef1b51e3eef?w=400&h=300&fit=crop" },
    { id: 5, name: "Halva", category: "dessert", price: 10000, description: "Shipli halva - an'anaviy o'zbek shirinligi", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop" },
    { id: 6, name: "Choy", category: "drink", price: 5000, description: "Issiq o'zbek choy", image: "https://images.unsplash.com/photo-1597318301270-a37f1e08c39f?w=400&h=300&fit=crop" }
];

// Render menu on index.html and menu.html
function loadMenu(filter = 'all') {
    const menuGrid = document.getElementById('menuGrid');
    if (!menuGrid) return;
    let filteredMenu = menuItems;
    if (filter !== 'all') filteredMenu = menuItems.filter(item => item.category === filter);
    menuGrid.innerHTML = '';
    filteredMenu.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.innerHTML = `
            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/400x300?text=${item.name}'">
            <div class="menu-card-content">
                <h3 class="menu-card-name">${item.name}</h3>
                <p>${item.description}</p>
                <span class="menu-card-price">${item.price.toLocaleString('uz-UZ')} so'm</span>
            </div>
        `;
        menuGrid.appendChild(card);
    });
}

// Filter menu (menu.html)
function filterMenu(category) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadMenu(category);
}

document.addEventListener('DOMContentLoaded', function() {
    loadMenu();
    // Premium scroll effect for landing
    const scrollDown = document.querySelector('.scroll-down');
    if (scrollDown) {
        scrollDown.addEventListener('click', function() {
            window.scrollTo({top: document.querySelector('.section').offsetTop, behavior: 'smooth'});
        });
    }
    // Firebase Phone Auth & Registration
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            'size': 'invisible',
            'callback': function(response) {
                // reCAPTCHA solved
            }
        });
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('regName').value;
            const phone = document.getElementById('regPhone').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const registerMessage = document.getElementById('registerMessage');
            // Firebase phone verification
            try {
                const confirmationResult = await firebase.auth().signInWithPhoneNumber(phone, window.recaptchaVerifier);
                const code = prompt('Telefon raqamga kelgan kodni kiriting:');
                const result = await confirmationResult.confirm(code);
                // Phone verified, now create user in backend
                const res = await fetch('/api/users/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone, email, password })
                });
                const data = await res.json();
                if (data.success) {
                    registerMessage.innerHTML = '<span style="color:green">Ro\'yxatdan o\'tish muvaffaqiyatli!</span>';
                    registerForm.reset();
                } else {
                    registerMessage.innerHTML = '<span style="color:red">' + (data.message || 'Xatolik!') + '</span>';
                }
            } catch (err) {
                registerMessage.innerHTML = '<span style="color:red">Telefon tasdiqlashda xatolik: ' + err.message + '</span>';
            }
        });
    }
});
