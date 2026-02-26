// frontend/js/dashboard.js
let projects = [];
let currentFilter = 'all';
let deleteProjectId = null;

document.addEventListener('DOMContentLoaded', function () {
    if (!requireAuth()) return;
    loadUserInfo();
    loadProjects();
    setupNavigation();
});

function loadUserInfo() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        const el = document.getElementById('userName');
        if (el) el.textContent = user.name;
        const avatarEl = document.getElementById('sidebarAvatar');
        if (avatarEl) {
            avatarEl.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=667eea&color=fff`;
        }
    }
}

function setupNavigation() {
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const section = this.dataset.section;
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
            const secEl = document.getElementById(`${section}Section`);
            if (secEl) secEl.classList.add('active');

            const headers = { projects: 'My Projects', templates: 'Project Templates', analytics: 'Analytics', settings: 'Settings' };
            const headerEl = document.querySelector('.header-left h1');
            if (headerEl) headerEl.textContent = headers[section] || section;

            if (section === 'analytics') updateAnalytics();
            if (section === 'settings') loadUserProfile();
        });
    });
}

async function loadProjects() {
    try {
        showLoading('Loading projects...');
        const data = await api.getProjects({ limit: 50 });
        projects = data.data;
        renderProjects();
        updateAnalytics();
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to load projects', 'error');
    }
}

function renderProjects() {
    const grid = document.getElementById('projectsGrid');
    const emptyState = document.getElementById('emptyState');
    if (!grid) return;

    const filteredProjects = currentFilter === 'all' ? projects : projects.filter(p => p.status === currentFilter);

    if (filteredProjects.length === 0) {
        grid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    grid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';

    grid.innerHTML = filteredProjects.map(project => `
        <div class="project-card" onclick="openProject('${project._id}')">
            <div class="project-thumbnail">
                <i class="fas fa-home"></i>
                <span class="project-status status-${project.status}">${formatStatus(project.status)}</span>
            </div>
            <div class="project-info">
                <h3>${project.name}</h3>
                <p>${project.description || 'No description'}</p>
                <div class="project-meta">
                    <span><i class="fas fa-ruler-combined"></i> ${project.metadata?.totalArea || 0} m²</span>
                    <span><i class="fas fa-layer-group"></i> ${project.floors?.length || 0} floors</span>
                    <span><i class="fas fa-door-open"></i> ${project.metadata?.totalRooms || 0} rooms</span>
                </div>
                <div class="project-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-primary" onclick="openProject('${project._id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="confirmDelete('${project._id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

function formatStatus(status) {
    const m = { draft: 'Draft', in_progress: 'In Progress', review: 'Review', approved: 'Approved', archived: 'Archived' };
    return m[status] || status;
}

function filterByStatus(status) {
    currentFilter = status;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === status));
    renderProjects();
}

function filterProjects() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = projects.filter(p => p.name.toLowerCase().includes(term) || (p.description || '').toLowerCase().includes(term));
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;
    grid.innerHTML = filtered.map(project => `
        <div class="project-card" onclick="openProject('${project._id}')">
            <div class="project-thumbnail"><i class="fas fa-home"></i></div>
            <div class="project-info">
                <h3>${project.name}</h3>
                <p>${project.description || 'No description'}</p>
            </div>
        </div>
    `).join('');
}

function showNewProjectModal() {
    document.getElementById('projectModal').style.display = 'flex';
}

function closeProjectModal() {
    document.getElementById('projectModal').style.display = 'none';
    document.getElementById('projectForm').reset();
}

async function createProject(event) {
    event.preventDefault();

    const projectData = {
        name: document.getElementById('projectName').value,
        description: document.getElementById('projectDescription').value,
        totalWidth: parseFloat(document.getElementById('projectWidth').value),
        totalDepth: parseFloat(document.getElementById('projectDepth').value),
        type: document.getElementById('projectType').value,
        specifications: { roofType: document.getElementById('roofType').value },
        floors: [{ level: 1, name: 'Ground Floor', height: 2.7, rooms: [] }]
    };

    try {
        showLoading('Creating project...');
        const data = await api.createProject(projectData);
        hideLoading();
        showToast('Project created successfully!', 'success');
        closeProjectModal();
        window.location.href = `architect.html?id=${data.data._id}`;
    } catch (error) {
        hideLoading();
        showToast(error.message || 'Failed to create project', 'error');
    }
}

function openProject(projectId) {
    window.location.href = `architect.html?id=${projectId}`;
}

function confirmDelete(id) {
    deleteProjectId = id;
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    deleteProjectId = null;
}

async function deleteProject() {
    if (!deleteProjectId) return;
    try {
        showLoading('Deleting project...');
        await api.deleteProject(deleteProjectId);
        hideLoading();
        projects = projects.filter(p => p._id !== deleteProjectId);
        renderProjects();
        updateAnalytics();
        closeDeleteModal();
        showToast('Project deleted', 'success');
    } catch (error) {
        hideLoading();
        showToast('Failed to delete project', 'error');
    }
}

async function createFromTemplate(templateType) {
    const templates = {
        modern: {
            name: 'Modern House', totalWidth: 15, totalDepth: 12, type: 'residential',
            specifications: { roofType: 'flat' },
            floors: [{ level: 1, name: 'Ground Floor', height: 2.7, rooms: [
                { name: 'Living Room', type: 'living', width: 6, depth: 5, x: 0, z: 0 },
                { name: 'Kitchen', type: 'kitchen', width: 4, depth: 4, x: 6, z: 0 },
                { name: 'Dining', type: 'dining', width: 4, depth: 4, x: 10, z: 0 },
                { name: 'Master Bedroom', type: 'bedroom', width: 4, depth: 4, x: 0, z: 5 },
                { name: 'Bathroom', type: 'bathroom', width: 3, depth: 3, x: 4, z: 5 },
                { name: 'Bedroom 2', type: 'bedroom', width: 3, depth: 3, x: 7, z: 5 }
            ]}]
        },
        traditional: {
            name: 'Traditional Home', totalWidth: 20, totalDepth: 15, type: 'residential',
            specifications: { roofType: 'pitched' },
            floors: [{ level: 1, name: 'Ground Floor', height: 2.7, rooms: [
                { name: 'Living Room', type: 'living', width: 5, depth: 6, x: 0, z: 0 },
                { name: 'Dining Room', type: 'dining', width: 4, depth: 4, x: 5, z: 0 },
                { name: 'Kitchen', type: 'kitchen', width: 4, depth: 4, x: 9, z: 0 },
                { name: 'Master Suite', type: 'bedroom', width: 5, depth: 5, x: 0, z: 6 },
                { name: 'Bathroom', type: 'bathroom', width: 3, depth: 3, x: 5, z: 6 },
                { name: 'Garage', type: 'garage', width: 6, depth: 5, x: 9, z: 6 }
            ]}]
        },
        minimalist: {
            name: 'Minimalist Home', totalWidth: 12, totalDepth: 10, type: 'residential',
            specifications: { roofType: 'flat' },
            floors: [{ level: 1, name: 'Ground Floor', height: 2.7, rooms: [
                { name: 'Open Living', type: 'living', width: 6, depth: 6, x: 0, z: 0 },
                { name: 'Kitchen', type: 'kitchen', width: 3, depth: 4, x: 6, z: 0 },
                { name: 'Bedroom', type: 'bedroom', width: 4, depth: 4, x: 6, z: 4 },
                { name: 'Bathroom', type: 'bathroom', width: 2, depth: 2, x: 0, z: 6 }
            ]}]
        },
        villa: {
            name: 'Luxury Villa', totalWidth: 25, totalDepth: 20, type: 'residential',
            specifications: { roofType: 'hip' },
            floors: [{ level: 1, name: 'Ground Floor', height: 3, rooms: [
                { name: 'Grand Living', type: 'living', width: 8, depth: 6, x: 0, z: 0 },
                { name: 'Formal Dining', type: 'dining', width: 5, depth: 4, x: 8, z: 0 },
                { name: 'Kitchen', type: 'kitchen', width: 5, depth: 4, x: 13, z: 0 },
                { name: 'Master Suite', type: 'bedroom', width: 6, depth: 5, x: 0, z: 6 },
                { name: 'Master Bath', type: 'bathroom', width: 4, depth: 4, x: 6, z: 6 },
                { name: 'Office', type: 'office', width: 4, depth: 3, x: 10, z: 6 },
                { name: 'Guest Room', type: 'bedroom', width: 4, depth: 4, x: 14, z: 6 }
            ]}]
        }
    };

    const template = templates[templateType];
    if (!template) return;

    try {
        showLoading('Creating from template...');
        const data = await api.createProject(template);
        hideLoading();
        showToast('Project created from template!', 'success');
        window.location.href = `architect.html?id=${data.data._id}`;
    } catch (error) {
        hideLoading();
        showToast(error.message || 'Failed to create from template', 'error');
    }
}

function updateAnalytics() {
    const totalProjects = projects.length;
    const totalArea = projects.reduce((sum, p) => sum + (p.metadata?.totalArea || 0), 0);
    const totalRooms = projects.reduce((sum, p) => sum + (p.metadata?.totalRooms || 0), 0);
    const totalValue = projects.reduce((sum, p) => sum + (p.metadata?.estimatedCost || 0), 0);

    const el = (id) => document.getElementById(id);
    if (el('totalProjects')) el('totalProjects').textContent = totalProjects;
    if (el('totalAreaStat')) el('totalAreaStat').textContent = `${totalArea.toLocaleString()} m²`;
    if (el('totalRoomsStat')) el('totalRoomsStat').textContent = totalRooms;
    if (el('totalValue')) el('totalValue').textContent = `$${totalValue.toLocaleString()}`;
}

async function loadUserProfile() {
    try {
        const data = await api.getProfile();
        const user = data.user;
        const el = (id) => document.getElementById(id);
        if (el('profileName')) el('profileName').value = user.name || '';
        if (el('profileEmail')) el('profileEmail').value = user.email || '';
        if (el('profileCompany')) el('profileCompany').value = user.company || '';
        if (el('profilePhone')) el('profilePhone').value = user.phone || '';
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}

async function updateProfile(event) {
    event.preventDefault();
    const profileData = {
        name: document.getElementById('profileName').value,
        email: document.getElementById('profileEmail').value,
        company: document.getElementById('profileCompany').value,
        phone: document.getElementById('profilePhone').value
    };
    try {
        showLoading('Updating profile...');
        await api.updateProfile(profileData);
        hideLoading();
        showToast('Profile updated!', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message || 'Update failed', 'error');
    }
}

document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
});
