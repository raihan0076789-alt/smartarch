// frontend/js/auth.js
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        showLoading('Logging in...');
        const data = await api.login({ email, password });

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        api.setToken(data.token);

        showToast('Login successful!', 'success');
        hideLoading();

        if (typeof closeModal === 'function') closeModal();
        if (typeof updateUIForLoggedInUser === 'function') updateUIForLoggedInUser(data.user);

        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
    } catch (error) {
        hideLoading();
        showToast(error.message || 'Login failed', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const company = document.getElementById('registerCompany') ? document.getElementById('registerCompany').value : '';

    try {
        showLoading('Creating account...');
        const data = await api.register({ name, email, password, company });

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        api.setToken(data.token);

        showToast('Account created successfully!', 'success');
        hideLoading();

        if (typeof closeModal === 'function') closeModal();
        if (typeof updateUIForLoggedInUser === 'function') updateUIForLoggedInUser(data.user);

        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
    } catch (error) {
        hideLoading();
        showToast(error.message || 'Registration failed', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    api.setToken(null);
    showToast('Logged out successfully', 'info');
    setTimeout(() => { window.location.href = 'index.html'; }, 800);
}

async function checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
        try {
            api.setToken(token);
            const userData = JSON.parse(userStr);
            if (typeof updateUIForLoggedInUser === 'function') {
                updateUIForLoggedInUser(userData);
            }
        } catch (error) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }
}

function requireAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }
    api.setToken(token);
    return true;
}

function updateUIForLoggedInUser(user) {
    const navAuth = document.getElementById('navAuth');
    const navUser = document.getElementById('navUser');

    if (navAuth) navAuth.style.display = 'none';
    if (navUser) {
        navUser.style.display = 'flex';
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            avatar.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=667eea&color=fff`;
        }
    }
}

window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;
window.checkAuth = checkAuth;
window.requireAuth = requireAuth;
window.updateUIForLoggedInUser = updateUIForLoggedInUser;
