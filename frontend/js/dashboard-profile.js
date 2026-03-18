// dashboard-profile.js — Profile picture upload & sync for SmartArch
// Works alongside existing auth.js / dashboard.js without touching them.

// ── Profile Picture IDs present in dashboard.html ──────────────
const AVATAR_IDS = ['sidebarAvatar', 'headerAvatar', 'settingsProfilePic', 'overviewProfilePic'];

// Returns a per-user storage key so each user's avatar is stored independently.
function getAvatarStorageKey() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const uid = user.id || user._id || 'guest';
        return 'user_avatar_' + uid;
    } catch (e) {
        return 'user_avatar_guest';
    }
}

// ── On load: restore saved profile picture ─────────────────────
document.addEventListener('DOMContentLoaded', function () {
    restoreProfilePicture();
    initSettingsNav();
    loadPreferences();
    populateProfileOverview();
    
});

// ── Restore profile picture from localStorage ──────────────────
function restoreProfilePicture() {
    const STORAGE_KEY = getAvatarStorageKey();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        setAllAvatars(saved);
    } else {
        // Fall back to user data from backend (avatar field only — no generated fallback)
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.avatar) {
                    setAllAvatars(user.avatar);
                }
                // No avatar at all → leave the default initials/placeholder shown by HTML
            } catch (e) { /* ignore */ }
        }
    }
}

function setAllAvatars(src) {
    AVATAR_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = src;
    });
}

// ── Handle file upload ─────────────────────────────────────────
function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file.', 'error');
        return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be less than 5MB.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const dataUrl = e.target.result;
        const STORAGE_KEY = getAvatarStorageKey();

        // Save to localStorage under per-user key
        localStorage.setItem(STORAGE_KEY, dataUrl);

        // Update all avatar elements
        setAllAvatars(dataUrl);

        // Persist in user object stored in localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                user.avatar = dataUrl;
                localStorage.setItem('user', JSON.stringify(user));
            } catch (e) { /* ignore */ }
        }

        // Push to backend (fire-and-forget — doesn't break anything if it fails)
        pushAvatarToBackend(dataUrl);

        showToast('Profile picture updated!', 'success');
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    event.target.value = '';
}

// ── Remove profile picture ─────────────────────────────────────
function removeProfilePic() {
    const STORAGE_KEY = getAvatarStorageKey();
    localStorage.removeItem(STORAGE_KEY);

    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            user.avatar = '';
            localStorage.setItem('user', JSON.stringify(user));
        } catch (e) { /* ignore */ }
    }

    // Clear src on all avatar elements — the HTML/CSS initials placeholder will show instead
    AVATAR_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = '';
    });
    showToast('Profile picture removed.', 'info');
}

// ── Push avatar to backend (non-blocking) ─────────────────────
async function pushAvatarToBackend(avatarDataUrl) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        await fetch('http://localhost:5000/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ avatar: avatarDataUrl })
        });
    } catch (e) {
        // Silent fail — local storage is the source of truth
    }
}


// ── Profile sub-tab switching (Overview / Edit Profile) ────────
function switchProfileTab(tabName, clickedBtn) {
    // Update tab button states
    document.querySelectorAll('.profile-tab').forEach(btn => btn.classList.remove('active'));
    clickedBtn.classList.add('active');

    // Show matching content panel
    document.querySelectorAll('.profile-content').forEach(panel => panel.classList.remove('active'));
    const target = document.getElementById('profile-tab-' + tabName);
    if (target) target.classList.add('active');

    // Populate overview data on switch
    if (tabName === 'overview') populateProfileOverview();
}

// ── Populate Overview tab with current user data ───────────────
function populateProfileOverview() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const el = id => document.getElementById(id);

        if (el('overviewName'))    el('overviewName').textContent    = user.name    || '—';
        if (el('overviewEmail'))   el('overviewEmail').textContent   = user.email   || '—';
        if (el('overviewPhone'))   el('overviewPhone').textContent   = user.phone   || '—';
        if (el('overviewCompany')) el('overviewCompany').textContent = user.company || '—';

        // Mirror avatar into overview pic
        const STORAGE_KEY = getAvatarStorageKey();
        const saved = localStorage.getItem(STORAGE_KEY);
        const src = saved || user.avatar || '';
        if (el('overviewProfilePic')) el('overviewProfilePic').src = src;
    } catch (e) { /* ignore */ }
}

// ── Settings sub-navigation ────────────────────────────────────
function initSettingsNav() {
    document.querySelectorAll('.settings-nav-item').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const panel = this.dataset.panel;
            document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
            const el = document.getElementById('panel-' + panel);
            if (el) el.classList.add('active');
        });
    });
}

// ── Settings navigation helper (from header avatar click) ──────
function switchToSettings() {
    // Click the settings nav item in sidebar
    const btn = document.querySelector('[data-section="settings"]');
    if (btn) btn.click();
}

// ── Save preferences to localStorage ──────────────────────────
function savePreference(key, value) {
    const prefs = JSON.parse(localStorage.getItem('user_prefs') || '{}');
    prefs[key] = value;
    localStorage.setItem('user_prefs', JSON.stringify(prefs));
    showToast('Preference saved.', 'success');
}

// ── Load and apply preferences ─────────────────────────────────
function loadPreferences() {
    const prefs = JSON.parse(localStorage.getItem('user_prefs') || '{}');
    const el = id => document.getElementById(id);

    if (el('autoSaveToggle'))   el('autoSaveToggle').checked   = prefs.autoSave   !== false;
    if (el('emailNotifToggle')) el('emailNotifToggle').checked  = prefs.emailNotif === true;
    if (el('defaultViewToggle'))el('defaultViewToggle').checked = prefs.defaultView === true;
    if (el('defaultUnit') && prefs.unit) el('defaultUnit').value = prefs.unit;
}

// ── Change password helper ─────────────────────────────────────
async function updatePassword(event) {
    event.preventDefault();
    const current = document.getElementById('currentPassword').value;
    const next    = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (!current || !next || !confirm) {
        showToast('Please fill in all password fields.', 'error');
        return;
    }
    if (next !== confirm) {
        showToast('New passwords do not match.', 'error');
        return;
    }
    if (next.length < 8) {
        showToast('New password must be at least 8 characters.', 'error');
        return;
    }

    try {
        showLoading('Updating password...');
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/auth/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword: current, newPassword: next })
        });
        const data = await res.json();
        hideLoading();
        if (!res.ok) throw new Error(data.message || 'Failed to update password');
        if (data.token) {
            localStorage.setItem('token', data.token);
            if (window.api) window.api.setToken(data.token);
        }
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value     = '';
        document.getElementById('confirmPassword').value = '';
        showToast('Password updated successfully!', 'success');
    } catch (err) {
        hideLoading();
        showToast(err.message || 'Failed to update password', 'error');
    }
}

window.handleProfilePicUpload = handleProfilePicUpload;
window.switchProfileTab       = switchProfileTab;
window.populateProfileOverview = populateProfileOverview;
window.removeProfilePic       = removeProfilePic;
window.switchToSettings       = switchToSettings;
window.savePreference         = savePreference;
window.updatePassword         = updatePassword;