// admin.js
// Advanced Admin Panel Interactivity
let adminToken = null;

function adminLogin() {
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    const errorDiv = document.getElementById('admin-login-error');
    errorDiv.style.display = 'none';
    fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if(data.success && data.token) {
            adminToken = data.token;
            localStorage.setItem('adminToken', adminToken);
            document.getElementById('adminLoginModal').style.display = 'none';
            document.body.classList.add('admin');
        } else {
            errorDiv.textContent = data.message || 'Login failed';
            errorDiv.style.display = 'block';
        }
    })
    .catch(() => {
        errorDiv.textContent = 'Server error';
        errorDiv.style.display = 'block';
    });
}

window.onload = function() {
    adminToken = localStorage.getItem('adminToken');
    if(!adminToken) {
        document.getElementById('adminLoginModal').style.display = 'flex';
        document.body.classList.remove('admin');
    } else {
        document.getElementById('adminLoginModal').style.display = 'none';
        document.body.classList.add('admin');
    }
}

function openCrudPanel() {
    document.getElementById('crudModal').style.display = 'flex';
    showCrudTab('menu');
}

function openAIPanel() {
    document.getElementById('aiModal').style.display = 'flex';
}

function closeAIPanel() {
    document.getElementById('aiModal').style.display = 'none';
}

function sendDeepSeek() {
    const prompt = document.getElementById('ai-prompt').value;
    const resultDiv = document.getElementById('ai-result');
    const errorDiv = document.getElementById('ai-error');
    resultDiv.textContent = '';
    errorDiv.style.display = 'none';
    fetch('/api/deepseek', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ prompt })
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            resultDiv.textContent = data.result;
        } else {
            errorDiv.textContent = data.message || 'AI xatosi';
            errorDiv.style.display = 'block';
        }
    })
    .catch(() => {
        errorDiv.textContent = 'Serverda xatolik';
        errorDiv.style.display = 'block';
    });
}
}

function openEditorPanel() {
    alert('Editor: Live code/content editing (Coming soon)');
    // TODO: Implement modal or section for code/content editor
}

function closeCrudPanel() {
    document.getElementById('crudModal').style.display = 'none';
}

function showCrudTab(tab) {
    // Hide all panels
    document.getElementById('crud-menu').style.display = 'none';
    document.getElementById('crud-bookings').style.display = 'none';
    document.getElementById('crud-users').style.display = 'none';
    // Remove active from all tabs
    document.getElementById('tab-menu').classList.remove('active');
    document.getElementById('tab-bookings').classList.remove('active');
    document.getElementById('tab-users').classList.remove('active');
    // Show selected panel and set active tab
    if(tab === 'menu') {
        document.getElementById('crud-menu').style.display = 'block';
        document.getElementById('tab-menu').classList.add('active');
        fetchMenuItems();
    } else if(tab === 'bookings') {
        document.getElementById('crud-bookings').style.display = 'block';
        document.getElementById('tab-bookings').classList.add('active');
        fetchBookings();
    } else if(tab === 'users') {
        document.getElementById('crud-users').style.display = 'block';
        document.getElementById('tab-users').classList.add('active');
        fetchUsers();
    }
}

function showAddMenuForm() {
    document.getElementById('add-menu-form').style.display = 'block';
}

function addMenuItem() {
    // Placeholder for adding menu item
    const name = document.getElementById('menu-name').value;
    const price = document.getElementById('menu-price').value;
    const category = document.getElementById('menu-category').value;
    if(name && price && category) {
        fetch('/api/menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ name, price, category })
        })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                fetchMenuItems();
                document.getElementById('add-menu-form').style.display = 'none';
                document.getElementById('menu-name').value = '';
                document.getElementById('menu-price').value = '';
                document.getElementById('menu-category').value = '';
            } else {
                alert('Error adding menu item');
            }
        });
    } else {
        alert('Please fill all fields.');
    }
}

function fetchMenuItems() {
    fetch('/api/menu')
        .then(res => res.json())
        .then(data => {
            const menuList = document.getElementById('menu-list');
            menuList.innerHTML = '';
            if(data.menu && data.menu.length) {
                data.menu.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'menu-item-row';
                    div.innerHTML = `<b>${item.name}</b> (${item.category}) - $${item.price} <button onclick="editMenuItem('${item._id}')">Edit</button> <button onclick="deleteMenuItem('${item._id}')">Delete</button>`;
                    menuList.appendChild(div);
                });
            } else {
                menuList.innerHTML = '<p>No menu items found.</p>';
            }
        });
}

function editMenuItem(id) {
    // TODO: Implement edit modal/form
    alert('Edit menu item: ' + id);
}

function deleteMenuItem(id) {
    if(confirm('Delete this menu item?')) {
        fetch(`/api/menu/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${adminToken}` } })
            .then(res => res.json())
            .then(data => {
                if(data.success) fetchMenuItems();
                else alert('Error deleting item');
            });
    }
}

function fetchBookings() {
    fetch('/api/bookings', { headers: { 'Authorization': `Bearer ${adminToken}` } })
        .then(res => res.json())
        .then(data => {
            const bookingsList = document.getElementById('bookings-list');
            bookingsList.innerHTML = '';
            if(data.bookings && data.bookings.length) {
                data.bookings.forEach(b => {
                    const div = document.createElement('div');
                    div.className = 'booking-row';
                    div.innerHTML = `<b>${b.name}</b> (${b.date}) <button onclick="editBooking('${b._id}')">Edit</button> <button onclick="deleteBooking('${b._id}')">Delete</button>`;
                    bookingsList.appendChild(div);
                });
            } else {
                bookingsList.innerHTML = '<p>No bookings found.</p>';
            }
        });
}

function editBooking(id) {
    // TODO: Implement edit modal/form
    alert('Edit booking: ' + id);
}

function deleteBooking(id) {
    if(confirm('Delete this booking?')) {
        fetch(`/api/bookings/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${adminToken}` } })
            .then(res => res.json())
            .then(data => {
                if(data.success) fetchBookings();
                else alert('Error deleting booking');
            });
    }
}

function fetchUsers() {
    fetch('/api/users', { headers: { 'Authorization': `Bearer ${adminToken}` } })
        .then(res => res.json())
        .then(data => {
            const usersList = document.getElementById('users-list');
            usersList.innerHTML = '';
            if(data.users && data.users.length) {
                data.users.forEach(u => {
                    const div = document.createElement('div');
                    div.className = 'user-row';
                    div.innerHTML = `<b>${u.username}</b> (${u.email}) <button onclick="editUser('${u._id}')">Edit</button> <button onclick="deleteUser('${u._id}')">Delete</button>`;
                    usersList.appendChild(div);
                });
            } else {
                usersList.innerHTML = '<p>No users found.</p>';
            }
        });
}

function editUser(id) {
    // TODO: Implement edit modal/form
    alert('Edit user: ' + id);
}

function deleteUser(id) {
    if(confirm('Delete this user?')) {
        fetch(`/api/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${adminToken}` } })
            .then(res => res.json())
            .then(data => {
                if(data.success) fetchUsers();
                else alert('Error deleting user');
            });
    }
}