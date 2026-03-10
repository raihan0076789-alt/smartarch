// frontend/js/admin.js
'use strict';

const ADMIN_API = 'http://localhost:5000/api/admin';

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
    token: null,
    admin: null,
    currentPage: 'dashboard',
    users: { data: [], page: 1, pages: 1, total: 0, search: '', sort: '-createdAt' },
    projects: { data: [], page: 1, pages: 1, total: 0, search: '', sort: '-createdAt', status: '', type: '' },
    charts: {}
};

// ─── HTTP Helper ──────────────────────────────────────────────────────────────
async function adminRequest(endpoint, options = {}) {
    const url = `${ADMIN_API}${endpoint}`;
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(state.token ? { 'Authorization': `Bearer ${state.token}` } : {}),
            ...options.headers
        }
    };
    const res = await fetch(url, config);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function initAuth() {
    const token = localStorage.getItem('adminToken');
    const admin = localStorage.getItem('adminUser');
    if (token && admin) {
        state.token = token;
        state.admin = JSON.parse(admin);
        return true;
    }
    return false;
}

function requireAdminAuth() {
    if (!initAuth()) {
        window.location.href = 'admin-login.html';
        return false;
    }
    return true;
}

function adminLogout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = 'admin-login.html';
}

// ─── Login Page ───────────────────────────────────────────────────────────────
async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const btn = document.getElementById('loginBtn');
    const errEl = document.getElementById('loginError');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    errEl.style.display = 'none';

    try {
        const data = await adminRequest('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.admin));
        window.location.href = 'admin.html';
    } catch (err) {
        errEl.textContent = err.message || 'Invalid credentials';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In to Admin';
    }
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigateTo(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const page = document.getElementById(`page-${pageName}`);
    if (page) page.classList.add('active');

    document.querySelectorAll(`.nav-item[data-page="${pageName}"]`).forEach(n => n.classList.add('active'));

    state.currentPage = pageName;
    updateTopbarTitle(pageName);

    if (pageName === 'dashboard') loadDashboard();
    else if (pageName === 'users') loadUsers();
    else if (pageName === 'projects') loadProjects();

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

function updateTopbarTitle(page) {
    const titles = {
        dashboard: { title: 'Dashboard', subtitle: 'Overview & analytics' },
        users: { title: 'User Management', subtitle: 'Manage all registered users' },
        projects: { title: 'Project Management', subtitle: 'Manage all projects' },
        analytics: { title: 'Analytics', subtitle: 'Detailed statistics & charts' }
    };
    const t = titles[page] || { title: page, subtitle: '' };
    const el = document.getElementById('pageTitle');
    const sub = document.getElementById('pageSubtitle');
    if (el) el.textContent = t.title;
    if (sub) sub.textContent = t.subtitle;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
async function loadDashboard() {
    try {
        const res = await adminRequest('/dashboard');
        const d = res.data;

        // Stats
        setEl('stat-total-users', d.stats.totalUsers);
        setEl('stat-total-projects', d.stats.totalProjects);
        setEl('stat-projects-today', d.stats.projectsToday);
        setEl('stat-users-today', d.stats.usersToday);
        setEl('stat-users-week', `+${d.stats.usersThisWeek}`);
        setEl('stat-projects-week', `+${d.stats.projectsThisWeek}`);

        renderRecentProjects(d.recentProjects);
        renderRecentUsers(d.recentUsers);
        renderTopUsers(d.topUsers);
        renderActivityFeed(d.recentProjects, d.recentUsers);

        // Charts
        renderLineChart('userGrowthChart', d.userGrowth, 'New Users', '#667eea');
        renderLineChart('projectGrowthChart', d.projectGrowth, 'New Projects', '#11998e');
        renderDonut('statusChart', d.projectsByStatus, 'status');
        renderDonut('typeChart', d.projectsByType, 'type');

    } catch (err) {
        showToast('Failed to load dashboard: ' + err.message, 'error');
    }
}

function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function renderRecentProjects(projects) {
    const el = document.getElementById('recentProjectsList');
    if (!el) return;
    if (!projects || !projects.length) {
        el.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>No projects yet</p></div>';
        return;
    }
    el.innerHTML = projects.map(p => `
        <div class="activity-item">
            <div class="activity-icon project"><i class="fas fa-home"></i></div>
            <div class="activity-body">
                <div class="activity-text"><strong>${esc(p.name)}</strong> by ${esc(p.owner?.name || 'Unknown')}</div>
                <div class="activity-time">${formatDate(p.createdAt)} · <span class="badge ${statusBadge(p.status)}">${p.status}</span></div>
            </div>
        </div>
    `).join('');
}

function renderRecentUsers(users) {
    const el = document.getElementById('recentUsersList');
    if (!el) return;
    if (!users || !users.length) {
        el.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No users yet</p></div>';
        return;
    }
    el.innerHTML = users.map(u => `
        <div class="activity-item">
            <div class="activity-icon user"><i class="fas fa-user-plus"></i></div>
            <div class="activity-body">
                <div class="activity-text"><strong>${esc(u.name)}</strong> joined</div>
                <div class="activity-time">${esc(u.email)} · ${formatDate(u.createdAt)}</div>
            </div>
        </div>
    `).join('');
}

function renderActivityFeed(projects, users) {
    const el = document.getElementById('activityFeed');
    if (!el) return;

    const items = [
        ...projects.map(p => ({ type: 'project', text: `New project <strong>${esc(p.name)}</strong> created`, time: p.createdAt })),
        ...users.map(u => ({ type: 'user', text: `<strong>${esc(u.name)}</strong> registered`, time: u.createdAt }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

    if (!items.length) {
        el.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>No recent activity</p></div>';
        return;
    }

    el.innerHTML = items.map(item => `
        <div class="activity-item">
            <div class="activity-icon ${item.type}">
                <i class="fas ${item.type === 'project' ? 'fa-home' : 'fa-user'}"></i>
            </div>
            <div class="activity-body">
                <div class="activity-text">${item.text}</div>
                <div class="activity-time">${formatDate(item.time)}</div>
            </div>
        </div>
    `).join('');
}

function renderTopUsers(users) {
    const el = document.getElementById('topUsersList');
    if (!el) return;
    if (!users || !users.length) {
        el.innerHTML = '<div class="empty-state"><i class="fas fa-trophy"></i><p>No data yet</p></div>';
        return;
    }
    el.innerHTML = users.map((u, i) => {
        const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
        return `
            <div class="top-user-item">
                <div class="rank-badge ${rankClass}">${i + 1}</div>
                <div class="user-avatar-sm">${initials(u.name)}</div>
                <div class="top-user-info">
                    <div class="top-user-name">${esc(u.name)}</div>
                    <div class="top-user-email">${esc(u.email)}</div>
                </div>
                <div class="top-user-count">${u.projectCount} <span style="font-size:0.7rem;color:var(--gray);font-weight:400;">projects</span></div>
            </div>
        `;
    }).join('');
}

// ─── Charts ───────────────────────────────────────────────────────────────────
function renderLineChart(canvasId, data, label, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (state.charts[canvasId]) state.charts[canvasId].destroy();

    const labels = data.map(d => d._id);
    const values = data.map(d => d.count);

    state.charts[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label,
                data: values,
                borderColor: color,
                backgroundColor: color + '20',
                borderWidth: 2.5,
                pointRadius: 3,
                pointBackgroundColor: color,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: '#f0f0f0' } }
            }
        }
    });
}

const DONUT_COLORS = ['#667eea', '#11998e', '#f5576c', '#4facfe', '#fa709a', '#fed330', '#26de81'];

function renderDonut(canvasId, data, field) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (state.charts[canvasId]) state.charts[canvasId].destroy();

    const labels = data.map(d => d._id || 'unknown');
    const values = data.map(d => d.count);
    const colors = DONUT_COLORS.slice(0, labels.length);

    state.charts[canvasId] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false }
            }
        }
    });

    // Legend
    const legendId = canvasId.replace('Chart', 'Legend');
    const legendEl = document.getElementById(legendId);
    if (legendEl) {
        legendEl.innerHTML = labels.map((l, i) => `
            <div class="legend-item">
                <div class="legend-dot" style="background:${colors[i]}"></div>
                <span class="legend-label">${l}</span>
                <span class="legend-value">${values[i]}</span>
            </div>
        `).join('');
    }
}

// ─── Users ────────────────────────────────────────────────────────────────────
async function loadUsers() {
    const el = document.getElementById('usersTableBody');
    if (el) el.innerHTML = '<tr><td colspan="6" class="loading-spinner"><i class="fas fa-spinner"></i> Loading...</td></tr>';

    try {
        const params = new URLSearchParams({
            page: state.users.page,
            limit: 15,
            search: state.users.search,
            sort: state.users.sort
        });
        const res = await adminRequest(`/users?${params}`);
        state.users.data = res.data;
        state.users.pages = res.pagination.pages;
        state.users.total = res.pagination.total;

        renderUsersTable(res.data);
        renderUsersPagination(res.pagination);
        setEl('usersTotalCount', `${res.pagination.total} users`);
    } catch (err) {
        if (el) el.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>${err.message}</p></td></tr>`;
    }
}

function renderUsersTable(users) {
    const el = document.getElementById('usersTableBody');
    if (!el) return;

    if (!users.length) {
        el.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-users"></i><p>No users found</p></div></td></tr>';
        return;
    }

    el.innerHTML = users.map(u => `
        <tr>
            <td>
                <div class="user-cell">
                    <div class="user-avatar-sm">${initials(u.name)}</div>
                    <div>
                        <div class="user-name">${esc(u.name)}</div>
                        <div class="user-email">${esc(u.email)}</div>
                    </div>
                </div>
            </td>
            <td><span class="badge ${roleBadge(u.role)}">${u.role}</span></td>
            <td>${u.projectCount ?? 0}</td>
            <td><span class="badge ${u.suspended ? 'badge-danger' : 'badge-success'}">${u.suspended ? 'Suspended' : 'Active'}</span></td>
            <td>${formatDate(u.createdAt)}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn view" title="View Details" onclick="openUserModal('${u._id}')"><i class="fas fa-eye"></i></button>
                    <button class="action-btn ${u.suspended ? 'success' : 'edit'}" title="${u.suspended ? 'Activate' : 'Suspend'}" onclick="toggleUserStatus('${u._id}', ${!u.suspended})">
                        <i class="fas ${u.suspended ? 'fa-user-check' : 'fa-user-slash'}"></i>
                    </button>
                    <button class="action-btn danger" title="Delete User" onclick="confirmDeleteUser('${u._id}', '${esc(u.name)}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderUsersPagination(p) {
    setEl('usersPaginationInfo', `Showing ${(p.page - 1) * p.limit + 1}–${Math.min(p.page * p.limit, p.total)} of ${p.total}`);
    const el = document.getElementById('usersPaginationBtns');
    if (!el) return;
    el.innerHTML = buildPaginationBtns(p.page, p.pages, 'usersPage');
}

async function openUserModal(userId) {
    const modal = document.getElementById('userDetailModal');
    if (!modal) return;
    modal.classList.add('open');
    document.getElementById('userDetailBody').innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i></div>';

    try {
        const res = await adminRequest(`/users/${userId}`);
        const u = res.data;
        document.getElementById('userDetailBody').innerHTML = `
            <div class="user-detail-header">
                <div class="user-avatar-lg">${initials(u.name)}</div>
                <div class="user-detail-info">
                    <h3>${esc(u.name)}</h3>
                    <p>${esc(u.email)}</p>
                    <span class="badge ${u.suspended ? 'badge-danger' : 'badge-success'} mt-1">${u.suspended ? 'Suspended' : 'Active'}</span>
                </div>
            </div>
            <div class="detail-grid">
                <div class="detail-item"><label>Role</label><p>${u.role}</p></div>
                <div class="detail-item"><label>Company</label><p>${u.company || '—'}</p></div>
                <div class="detail-item"><label>Phone</label><p>${u.phone || '—'}</p></div>
                <div class="detail-item"><label>Joined</label><p>${formatDate(u.createdAt)}</p></div>
                <div class="detail-item"><label>Projects</label><p>${u.projects?.length || 0}</p></div>
                <div class="detail-item"><label>Theme</label><p>${u.preferences?.theme || 'light'}</p></div>
            </div>
            ${u.projects?.length ? `
            <div>
                <h4 style="font-size:0.85rem;color:var(--gray);margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.5px;">Projects</h4>
                ${u.projects.slice(0, 5).map(p => `
                    <div class="activity-item">
                        <div class="activity-icon project"><i class="fas fa-home"></i></div>
                        <div class="activity-body">
                            <div class="activity-text"><strong>${esc(p.name)}</strong></div>
                            <div class="activity-time"><span class="badge ${statusBadge(p.status)}">${p.status}</span> · ${formatDate(p.createdAt)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : ''}
        `;
    } catch (err) {
        document.getElementById('userDetailBody').innerHTML = `<p style="color:var(--danger)">${err.message}</p>`;
    }
}

async function toggleUserStatus(userId, suspend) {
    try {
        await adminRequest(`/users/${userId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ suspended: suspend })
        });
        showToast(`User ${suspend ? 'suspended' : 'activated'} successfully`, 'success');
        loadUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

let pendingDeleteUserId = null;
function confirmDeleteUser(userId, name) {
    pendingDeleteUserId = userId;
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent = 'Delete User';
    document.getElementById('confirmMessage').textContent = `Are you sure you want to delete "${name}"? This will also delete all their projects. This action cannot be undone.`;
    document.getElementById('confirmBtn').onclick = deleteUser;
    modal.classList.add('open');
}

async function deleteUser() {
    if (!pendingDeleteUserId) return;
    try {
        await adminRequest(`/users/${pendingDeleteUserId}`, { method: 'DELETE' });
        showToast('User deleted successfully', 'success');
        closeModal('confirmModal');
        loadUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
    pendingDeleteUserId = null;
}

// ─── Projects ─────────────────────────────────────────────────────────────────
async function loadProjects() {
    const el = document.getElementById('projectsTableBody');
    if (el) el.innerHTML = '<tr><td colspan="6" class="loading-spinner"><i class="fas fa-spinner"></i> Loading...</td></tr>';

    try {
        const params = new URLSearchParams({
            page: state.projects.page,
            limit: 15,
            search: state.projects.search,
            sort: state.projects.sort,
            status: state.projects.status,
            type: state.projects.type
        });
        const res = await adminRequest(`/projects?${params}`);
        state.projects.data = res.data;
        state.projects.pages = res.pagination.pages;
        state.projects.total = res.pagination.total;

        renderProjectsTable(res.data);
        renderProjectsPagination(res.pagination);
        setEl('projectsTotalCount', `${res.pagination.total} projects`);
    } catch (err) {
        if (el) el.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>${err.message}</p></div></td></tr>`;
    }
}

function renderProjectsTable(projects) {
    const el = document.getElementById('projectsTableBody');
    if (!el) return;

    if (!projects.length) {
        el.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-folder-open"></i><p>No projects found</p></div></td></tr>';
        return;
    }

    el.innerHTML = projects.map(p => `
        <tr>
            <td>
                <div>
                    <div class="user-name">${esc(p.name)}</div>
                    <div class="user-email">${p.description ? esc(p.description.slice(0, 50)) + '...' : '—'}</div>
                </div>
            </td>
            <td>
                <div class="user-cell">
                    <div class="user-avatar-sm" style="width:28px;height:28px;font-size:0.7rem">${initials(p.owner?.name || '?')}</div>
                    <span style="font-size:0.85rem">${esc(p.owner?.name || 'Unknown')}</span>
                </div>
            </td>
            <td><span class="badge ${statusBadge(p.status)}">${p.status}</span></td>
            <td><span class="badge badge-gray">${p.type}</span></td>
            <td>${formatDate(p.createdAt)}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn view" title="View Details" onclick="openProjectModal('${p._id}')"><i class="fas fa-eye"></i></button>
                    <button class="action-btn ${p.isPublic ? 'edit' : 'success'}" title="${p.isPublic ? 'Make Private' : 'Make Public'}" onclick="toggleProjectVisibility('${p._id}', ${!p.isPublic})">
                        <i class="fas ${p.isPublic ? 'fa-eye-slash' : 'fa-globe'}"></i>
                    </button>
                    <button class="action-btn danger" title="Delete Project" onclick="confirmDeleteProject('${p._id}', '${esc(p.name)}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderProjectsPagination(p) {
    setEl('projectsPaginationInfo', `Showing ${(p.page - 1) * p.limit + 1}–${Math.min(p.page * p.limit, p.total)} of ${p.total}`);
    const el = document.getElementById('projectsPaginationBtns');
    if (!el) return;
    el.innerHTML = buildPaginationBtns(p.page, p.pages, 'projectsPage');
}

async function openProjectModal(projectId) {
    const modal = document.getElementById('projectDetailModal');
    if (!modal) return;
    modal.classList.add('open');
    document.getElementById('projectDetailBody').innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i></div>';

    try {
        const res = await adminRequest(`/projects/${projectId}`);
        const p = res.data;
        document.getElementById('projectDetailBody').innerHTML = `
            <div class="detail-grid">
                <div class="detail-item"><label>Project Name</label><p>${esc(p.name)}</p></div>
                <div class="detail-item"><label>Owner</label><p>${esc(p.owner?.name || 'Unknown')}</p></div>
                <div class="detail-item"><label>Status</label><p><span class="badge ${statusBadge(p.status)}">${p.status}</span></p></div>
                <div class="detail-item"><label>Type</label><p>${p.type}</p></div>
                <div class="detail-item"><label>Floors</label><p>${p.floors?.length || 0}</p></div>
                <div class="detail-item"><label>Total Area</label><p>${p.metadata?.totalArea ? p.metadata.totalArea.toFixed(1) + ' m²' : '—'}</p></div>
                <div class="detail-item"><label>Total Rooms</label><p>${p.metadata?.totalRooms || 0}</p></div>
                <div class="detail-item"><label>Est. Cost</label><p>${p.metadata?.estimatedCost ? '$' + p.metadata.estimatedCost.toLocaleString() : '—'}</p></div>
                <div class="detail-item"><label>Visibility</label><p><span class="badge ${p.isPublic ? 'badge-success' : 'badge-gray'}">${p.isPublic ? 'Public' : 'Private'}</span></p></div>
                <div class="detail-item"><label>Created</label><p>${formatDate(p.createdAt)}</p></div>
            </div>
            ${p.description ? `<div style="margin-top:1rem"><label style="font-size:0.75rem;color:var(--gray);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Description</label><p style="margin-top:0.4rem;font-size:0.9rem;color:var(--dark)">${esc(p.description)}</p></div>` : ''}
        `;
    } catch (err) {
        document.getElementById('projectDetailBody').innerHTML = `<p style="color:var(--danger)">${err.message}</p>`;
    }
}

async function toggleProjectVisibility(projectId, isPublic) {
    try {
        await adminRequest(`/projects/${projectId}/visibility`, {
            method: 'PATCH',
            body: JSON.stringify({ isPublic })
        });
        showToast(`Project made ${isPublic ? 'public' : 'private'}`, 'success');
        loadProjects();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

let pendingDeleteProjectId = null;
function confirmDeleteProject(projectId, name) {
    pendingDeleteProjectId = projectId;
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent = 'Delete Project';
    document.getElementById('confirmMessage').textContent = `Are you sure you want to delete "${name}"? This action cannot be undone.`;
    document.getElementById('confirmBtn').onclick = deleteProject;
    modal.classList.add('open');
}

async function deleteProject() {
    if (!pendingDeleteProjectId) return;
    try {
        await adminRequest(`/projects/${pendingDeleteProjectId}`, { method: 'DELETE' });
        showToast('Project deleted successfully', 'success');
        closeModal('confirmModal');
        loadProjects();
    } catch (err) {
        showToast(err.message, 'error');
    }
    pendingDeleteProjectId = null;
}

// ─── Pagination Helper ────────────────────────────────────────────────────────
function buildPaginationBtns(currentPage, totalPages, handler) {
    let html = `<button class="page-btn" onclick="${handler}(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="${handler}(${i})">${i}</button>`;
    }
    html += `<button class="page-btn" onclick="${handler}(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    return html;
}

function usersPage(page) {
    state.users.page = page;
    loadUsers();
}

function projectsPage(page) {
    state.projects.page = page;
    loadProjects();
}

// ─── Modal Helpers ────────────────────────────────────────────────────────────
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function initials(name) {
    if (!name) return '?';
    return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusBadge(status) {
    const map = {
        draft: 'badge-gray',
        in_progress: 'badge-info',
        review: 'badge-warning',
        approved: 'badge-success',
        archived: 'badge-gray'
    };
    return map[status] || 'badge-gray';
}

function roleBadge(role) {
    const map = { user: 'badge-info', architect: 'badge-purple', admin: 'badge-danger' };
    return map[role] || 'badge-gray';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Detect which page we're on
    if (document.getElementById('adminLoginForm')) {
        // Login page
        document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
        return;
    }

    // Dashboard page
    if (!requireAdminAuth()) return;

    // Populate admin info
    const admin = state.admin;
    if (admin) {
        setEl('adminName', admin.name);
        setEl('adminEmail', admin.email);
        setEl('adminNameInitials', initials(admin.name));
    }

    // Nav items
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', () => navigateTo(item.dataset.page));
    });

    // Search users
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        let searchTimeout;
        userSearch.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.users.search = userSearch.value;
                state.users.page = 1;
                loadUsers();
            }, 400);
        });
    }

    // Sort users
    const userSort = document.getElementById('userSort');
    if (userSort) {
        userSort.addEventListener('change', () => {
            state.users.sort = userSort.value;
            state.users.page = 1;
            loadUsers();
        });
    }

    // Search projects
    const projectSearch = document.getElementById('projectSearch');
    if (projectSearch) {
        let t;
        projectSearch.addEventListener('input', () => {
            clearTimeout(t);
            t = setTimeout(() => {
                state.projects.search = projectSearch.value;
                state.projects.page = 1;
                loadProjects();
            }, 400);
        });
    }

    // Filter projects by status/type
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            state.projects.status = statusFilter.value;
            state.projects.page = 1;
            loadProjects();
        });
    }
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) {
        typeFilter.addEventListener('change', () => {
            state.projects.type = typeFilter.value;
            state.projects.page = 1;
            loadProjects();
        });
    }

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); });
    });

    // Mobile sidebar toggle
    const menuBtn = document.getElementById('mobileMenuBtn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    }

    // Initial load
    navigateTo('dashboard');
});

// Expose globals needed by inline onclick
window.navigateTo = navigateTo;
window.openUserModal = openUserModal;
window.openProjectModal = openProjectModal;
window.toggleUserStatus = toggleUserStatus;
window.toggleProjectVisibility = toggleProjectVisibility;
window.confirmDeleteUser = confirmDeleteUser;
window.confirmDeleteProject = confirmDeleteProject;
window.deleteUser = deleteUser;
window.deleteProject = deleteProject;
window.closeModal = closeModal;
window.adminLogout = adminLogout;
window.usersPage = usersPage;
window.projectsPage = projectsPage;
