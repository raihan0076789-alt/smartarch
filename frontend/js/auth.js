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

        // Persist avatar in per-user key so it survives logout/login cycles
        if (data.user && data.user.avatar) {
            const uid = data.user.id || data.user._id || 'guest';
            localStorage.setItem('user_avatar_' + uid, data.user.avatar);
        }

        showToast('Login successful!', 'success');
        hideLoading();

        if (typeof closeModal === 'function') closeModal();
        if (typeof updateUIForLoggedInUser === 'function') updateUIForLoggedInUser(data.user);

        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
    } catch (error) {
        hideLoading();
        if (error.requiresVerification || (error.data && error.data.requiresVerification)) {
            const userEmail = (error.data && error.data.email) || '';
            if (typeof closeModal === 'function') closeModal();
            if (typeof showVerificationPending === 'function') {
                showVerificationPending(userEmail);
                showToast('Check your email for the verification code.', 'info');
            } else {
                showToast(error.message || 'Please verify your email before logging in.', 'error');
            }
        } else {
            showToast(error.message || 'Login failed', 'error');
        }
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const name     = document.getElementById('registerName').value;
    const email    = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const company  = document.getElementById('registerCompany') ? document.getElementById('registerCompany').value : '';


    // 🔴 Confirm Password Check
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    // ── Client-side password strength validation ──────────────────────────
    const pwRules = [
        { test: password.length >= 8,            msg: 'Password must be at least 8 characters.' },
        { test: /[A-Z]/.test(password),           msg: 'Password must contain at least one uppercase letter.' },
        { test: /[a-z]/.test(password),           msg: 'Password must contain at least one lowercase letter.' },
        { test: /[0-9]/.test(password),           msg: 'Password must contain at least one number.' },
        { test: /[^A-Za-z0-9]/.test(password),   msg: 'Password must contain at least one special character (e.g. @#!$%).' }
    ];

    for (const rule of pwRules) {
        if (!rule.test) {
            showToast(rule.msg, 'error');
            return;
        }
    }
      // ────────────────────────────────────────────────────────────────────

    try {
        showLoading('Creating account...');
        const data = await api.register({ name, email, password, company });
        hideLoading();

        if (data.requiresVerification) {
            // Email verification required — show pending screen, do NOT log in
            if (typeof closeModal === 'function') closeModal();
            if (typeof showVerificationPending === 'function') {
                showVerificationPending(data.email || email);
            } else {
                showToast('Account created! Please check your email to verify your account.', 'success');
            }
            return;
        }

        // Fallback (should not reach here with current backend)
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        api.setToken(data.token);
        showToast('Account created successfully!', 'success');
        if (typeof closeModal === 'function') closeModal();
        if (typeof updateUIForLoggedInUser === 'function') updateUIForLoggedInUser(data.user);
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
    } catch (error) {
        hideLoading();
        if (error.errors && Array.isArray(error.errors)) {
            error.errors.forEach(e => showToast(e.msg, 'error'));
        } else {
            showToast(error.message || 'Registration failed', 'error');
        }
    }
}

// ─── GOOGLE SIGN-IN ──────────────────────────────────────────────────────────
// loginWithGoogle() is the fallback for when GSI renders its own button.
// It is only called by the hidden fallback <button> elements.
function loginWithGoogle() {
    if (typeof google === 'undefined' || !google.accounts) {
        showToast('Google Sign-In is not available. Check your internet connection.', 'error');
        return;
    }
    google.accounts.id.prompt();
}

// Called by Google Identity Services after the user picks an account
async function handleGoogleCredential(response) {
    try {
        showLoading('Signing in with Google...');
        const data = await api.googleAuth(response.credential);

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        api.setToken(data.token);

        if (data.user && data.user.avatar) {
            const uid = data.user.id || data.user._id || 'guest';
            localStorage.setItem('user_avatar_' + uid, data.user.avatar);
        }

        hideLoading();
        showToast('Signed in with Google!', 'success');

        if (typeof closeModal === 'function') closeModal();
        if (typeof updateUIForLoggedInUser === 'function') updateUIForLoggedInUser(data.user);

        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
    } catch (error) {
        hideLoading();
        showToast(error.message || 'Google sign-in failed. Please try again.', 'error');
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
    const token   = localStorage.getItem('token');
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
    const mobileNavAuth = document.getElementById('mobileNavAuth');
    const mobileNavUser = document.getElementById('mobileNavUser');

    if (navAuth) navAuth.style.display = 'none';
    if (navUser) {
        navUser.style.display = 'flex';
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            const uid = user.id || user._id || 'guest';
            const savedPic = localStorage.getItem('user_avatar_' + uid);
            avatar.src = savedPic || user.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=00d4c8&color=060a12&bold=true`;
        }
    }
    if (mobileNavAuth) mobileNavAuth.style.display = 'none';
    if (mobileNavUser) {
        mobileNavUser.style.display = 'flex';
        mobileNavUser.style.flexDirection = 'column';
    }
}

window.handleLogin            = handleLogin;
window.handleRegister         = handleRegister;
window.logout                 = logout;
window.checkAuth              = checkAuth;
window.requireAuth            = requireAuth;
window.updateUIForLoggedInUser = updateUIForLoggedInUser;
window.loginWithGoogle        = loginWithGoogle;
window.handleGoogleCredential = handleGoogleCredential;