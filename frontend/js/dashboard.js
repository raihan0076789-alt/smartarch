// frontend/js/dashboard.js
// Original logic preserved; chart hooks + profile picture loading added.
let projects = [];
let currentFilter = 'all';
let deleteProjectId = null;
// Password validation refs
let newPasswordEl, confirmPasswordEl;

document.addEventListener('DOMContentLoaded', function () {

    if (!requireAuth()) return;

    loadUserInfo();
    loadProjects();
    setupNavigation();
   

    // open section from URL
    setTimeout(() => {
        openSectionFromURL();
    }, 200);

});

function loadUserInfo() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        const el = document.getElementById('userName');
        if (el) el.textContent = user.name;

        // Determine avatar: check per-user localStorage key first (same key used by dashboard-profile.js),
        // then fall back to user.avatar, then ui-avatars
        const uid = user.id || user._id || 'guest';
        const savedPic = localStorage.getItem('user_avatar_' + uid);
        const avatarSrc = savedPic || user.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=00d4c8&color=060a12&bold=true&size=128`;

        ['sidebarAvatar', 'headerAvatar'].forEach(id => {
            const avatarEl = document.getElementById(id);
            if (avatarEl) avatarEl.src = avatarSrc;
        });
    }
}

// Handle URL hash navigation (e.g. dashboard.html#messagesSection)
function openSectionFromURL() {
    const hash = window.location.hash;
    if (!hash) return;

    const sectionMap = {
        '#projectsSection':  'projects',
        '#templatesSection': 'templates',
        '#analyticsSection': 'analytics',
        '#settingsSection':  'settings',
        '#messagesSection':  'messages',
    };

    // Find matching section key
    const sectionKey = Object.keys(sectionMap).find(k => hash.startsWith(k));
    if (!sectionKey) return;

    const section = sectionMap[sectionKey];

    // Activate via nav click simulation
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(b => b.classList.remove('active'));

    const secEl = document.getElementById(`${section}Section`);
    if (secEl) secEl.classList.add('active');

    const navBtn = document.querySelector(`[data-section="${section}"]`);
    if (navBtn) navBtn.classList.add('active');

    // Update header title
    const headerTitles = { projects:'My Projects', templates:'Project Templates', analytics:'Analytics', settings:'Settings', messages:'My Messages' };
    const headerEl = document.getElementById('headerTitle');
    if (headerEl) headerEl.textContent = headerTitles[section] || section;

    const actionBtn = document.getElementById('headerActionBtn');
    if (actionBtn) actionBtn.style.display = (section === 'projects') ? '' : 'none';

    // Trigger data load
    if (section === 'messages') loadUserTickets();
    if (section === 'analytics') { if (typeof updateAnalytics === 'function') updateAnalytics(); }
    if (section === 'settings') { if (typeof loadUserProfile === 'function') loadUserProfile(); }
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

            const headers = {
                projects:  'My Projects',
                templates: 'Project Templates',
                analytics: 'Analytics',
                settings:  'Settings',
                messages:  'My Messages',
                Guide:     'How to Use'
            };
            const headerEl = document.getElementById('headerTitle');
            if (headerEl) headerEl.textContent = headers[section] || section;

            // Show/hide New Project button
            const actionBtn = document.getElementById('headerActionBtn');
            if (actionBtn) actionBtn.style.display = (section === 'projects') ? '' : 'none';

            if (section === 'analytics') {
                updateAnalytics();
                // Small delay to let section become visible before drawing charts
                setTimeout(() => { if (typeof refreshCharts === 'function') refreshCharts(); }, 60);
            }
           if (section === 'settings') {
                loadUserProfile();

                // 🔥 ADD THIS (with delay)
                setTimeout(() => {
                    initPasswordValidation();
                }, 100);
            }
            if (section === 'messages') {
                loadUserTickets();
            }
        });
    });
}

async function loadProjects() {
    try {
        showLoading('Loading projects...');
        const data = await api.getProjects({ limit: 50 });
        projects = data.data;
        window.projects = projects; // expose for charts
        renderProjects();
        updateAnalytics();
        hideLoading();
        // Silently fetch AI scores in the background — does not block render
        fetchAllAIScores();
        // Silently fetch review ratings in the background
        fetchAllRatings();
    } catch (error) {
        hideLoading();
        showToast('Failed to load projects', 'error');
    }
}

// Fetch AI feedback scores for all projects in the background.
// When a score arrives it patches the in-memory project object and
// updates only that card's strip — no full re-render, no flicker.
async function fetchAllAIScores() {
    if (!projects || projects.length === 0) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    for (const project of projects) {
        if (project._aiFeedbackLoaded) continue;
        try {
            const res = await fetch('http://localhost:5000/api/projects/' + project._id + '/ai-feedback', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!res.ok) continue;
            const data = await res.json();
            project.aiFeedback = (data && data.aiFeedback) ? data.aiFeedback : null;
            project._aiFeedbackLoaded = true;
            patchScoreStrip(project);
        } catch (e) {
            // Non-fatal — card stays "Not analysed"
        }
    }
}

// Replace the score strip HTML for a single card already in the DOM
function patchScoreStrip(project) {
    const card = document.querySelector('.project-card[data-project-id="' + project._id + '"]');
    if (!card) return;
    const strip = card.querySelector('.ai-score-strip');
    if (!strip) return;
    const newStrip = document.createElement('div');
    newStrip.innerHTML = aiScoreStripHtml(project);
    const newEl = newStrip.firstElementChild;
    if (newEl) strip.replaceWith(newEl);
}

// ── Rating badge helpers ──────────────────────────────────────────
function ratingBadgeHtml(project) {
    if (!project._ratingsLoaded) return '<i class="fas fa-star" style="color:#2d3748;font-size:.7rem"></i>';
    if (project._avgRating == null) return '';
    return '<i class="fas fa-star" style="color:#f59e0b;font-size:.7rem"></i> ' + project._avgRating;
}

function patchRatingBadge(project) {
    const el = document.getElementById('rating-' + project._id);
    if (el) el.innerHTML = ratingBadgeHtml(project);
}

// Silently fetch avg rating for every project in the background.
async function fetchAllRatings() {
    if (!projects || !projects.length) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    for (const project of projects) {
        if (project._ratingsLoaded) continue;
        try {
            const res = await fetch('http://localhost:5000/api/reviews/' + project._id, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!res.ok) continue;
            const data = await res.json();
            const avg = data.data && data.data.summary && data.data.summary.average;
            project._avgRating = avg != null ? avg : null;
            project._ratingsLoaded = true;
            patchRatingBadge(project);
        } catch (e) { /* non-fatal */ }
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
        <div class="project-card" data-project-id="${project._id}" onclick="openProject('${project._id}')">
            <div class="project-thumbnail">
                <i class="fas fa-home"></i>
                <span class="project-status status-${project.status}">${formatStatus(project.status)}</span>
            </div>
            <div class="project-info">
                <h3>${escHtml(project.name)}</h3>
                <p>${escHtml(project.description || 'No description')}</p>
                <div class="project-meta">
                    <span><i class="fas fa-ruler-combined"></i> ${project.metadata?.totalArea || 0} m²</span>
                    <span><i class="fas fa-layer-group"></i> ${project.floors?.length || 0} floors</span>
                    <span><i class="fas fa-door-open"></i> ${project.metadata?.totalRooms || 0} rooms</span>
                    <span class="proj-rating-badge" id="rating-${project._id}">${ratingBadgeHtml(project)}</span>
                </div>
                <div class="project-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-primary" onclick="openProject('${project._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="confirmDelete('${project._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${aiScoreStripHtml(project)}
        </div>
    `).join('');
}

function escHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
}

function formatStatus(status) {
    const m = { draft: 'Draft', in_progress: 'In Progress', review: 'Review', approved: 'Approved', archived: 'Archived' };
    return m[status] || status;
}

// ── AI Score Strip helpers ──────────────────────────────────────────
function aiScoreColor(score) {
    if (score >= 8) return '#4ade80';
    if (score >= 6) return '#facc15';
    if (score >= 4) return '#fb923c';
    return '#f87171';
}

function aiScoreStripHtml(project) {
    const fb = project.aiFeedback;
    const score = fb && fb.overallScore != null ? fb.overallScore : null;

    if (score === null) {
        return '<div class="ai-score-strip not-analysed">' +
            '<span class="ai-score-strip-label">AI score</span>' +
            '<span class="ai-score-value">Not analysed</span>' +
        '</div>';
    }

    const color = aiScoreColor(score);
    const dots  = Array.from({ length: 10 }, function(_, i) {
        return '<div class="ai-score-dot" style="' + (i < score ? 'background:' + color : '') + '"></div>';
    }).join('');

    return '<div class="ai-score-strip">' +
        '<span class="ai-score-strip-label">AI score</span>' +
        '<div class="ai-score-dots">' + dots + '</div>' +
        '<span class="ai-score-value" style="color:' + color + '">' + score + '/10</span>' +
    '</div>';
}

function filterByStatus(status) {
    currentFilter = status;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === status));
    renderProjects();
}

function filterProjects() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = projects.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.description || '').toLowerCase().includes(term)
    );
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;

    if (filtered.length === 0) {
        grid.style.display = 'none';
        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    grid.style.display = 'grid';
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.style.display = 'none';

    grid.innerHTML = filtered.map(project => `
        <div class="project-card" data-project-id="${project._id}" onclick="openProject('${project._id}')">
            <div class="project-thumbnail">
                <i class="fas fa-home"></i>
                <span class="project-status status-${project.status}">${formatStatus(project.status)}</span>
            </div>
            <div class="project-info">
                <h3>${escHtml(project.name)}</h3>
                <p>${escHtml(project.description || 'No description')}</p>
                <div class="project-meta">
                    <span><i class="fas fa-ruler-combined"></i> ${project.metadata?.totalArea || 0} m²</span>
                    <span><i class="fas fa-layer-group"></i> ${project.floors?.length || 0} floors</span>
                    <span><i class="fas fa-door-open"></i> ${project.metadata?.totalRooms || 0} rooms</span>
                    <span class="proj-rating-badge" id="rating-${project._id}">${ratingBadgeHtml(project)}</span>
                </div>
                <div class="project-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-primary" onclick="openProject('${project._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="confirmDelete('${project._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${aiScoreStripHtml(project)}
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
        name:        document.getElementById('projectName').value,
        description: document.getElementById('projectDescription').value,
        totalWidth:  parseFloat(document.getElementById('projectWidth').value),
        totalDepth:  parseFloat(document.getElementById('projectDepth').value),
        type:        document.getElementById('projectType').value,
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
        window.projects = projects;
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
    // ─────────────────────────────────────────────────────────────────────────
    //  Architecturally accurate template layouts
    //  Rules applied:
    //   • Public zone (living/kitchen/dining) at front (low z)
    //   • Private zone (bedrooms) at rear (high z)
    //   • Wet rooms (bathroom/WC) grouped together, accessible from corridor
    //   • Circulation: hallway/corridor rooms separate public from private
    //   • Doors placed on shared walls; windows on exterior walls only
    //   • Room sizes match real-world standards for each style
    //   • Traditional & Luxury are 2-storey; Modern & Minimalist are 1-storey
    // ─────────────────────────────────────────────────────────────────────────
    const templates = {

        // ── MODERN HOUSE ──────────────────────────────────────────────────────
        // 18 × 13 m · 1 floor · flat roof · open-plan public zone
        // Layout: open-plan L+K+D across full front width
        //         hallway strip separates front from rear
        //         master bedroom + ensuite + bedroom 2 + bathroom at rear
        modern: {
            name: 'Modern House',
            totalWidth: 18, totalDepth: 13,
            type: 'residential', style: 'modern',
            specifications: { roofType: 'flat', floorHeight: 3.0 },
            floors: [{
                level: 1, name: 'Ground Floor', height: 3.0,
                rooms: [
                    // ── Front public zone (z 0–6) ──
                    {
                        name: 'Living Room', type: 'living',
                        width: 8, depth: 6, x: 0, z: 0,
                        windows: [
                            { wall: 'top', pos: 0.25, width: 1.8 },
                            { wall: 'top', pos: 0.70, width: 1.8 },
                            { wall: 'left', pos: 0.5, width: 1.5 }
                        ],
                        doors: [
                            { wall: 'bottom', pos: 0.5, width: 0.9 },   // to hallway
                            { wall: 'right',  pos: 0.5, width: 0.9 }    // to kitchen
                        ]
                    },
                    {
                        name: 'Kitchen', type: 'kitchen',
                        width: 5.5, depth: 4, x: 8, z: 0,
                        windows: [
                            { wall: 'top', pos: 0.5, width: 1.4 }
                        ],
                        doors: [
                            { wall: 'right', pos: 0.5, width: 0.9 }     // to dining
                        ]
                    },
                    {
                        name: 'Dining Room', type: 'dining',
                        width: 4.5, depth: 4, x: 13.5, z: 0,
                        windows: [
                            { wall: 'top',   pos: 0.5, width: 1.4 },
                            { wall: 'right', pos: 0.5, width: 1.2 }
                        ],
                        doors: [
                            { wall: 'bottom', pos: 0.5, width: 0.9 }    // to hallway
                        ]
                    },
                    // ── Utility / laundry (front-right corner) ──
                    {
                        name: 'Utility Room', type: 'other',
                        width: 4.5, depth: 2, x: 13.5, z: 4,
                        windows: [
                            { wall: 'right', pos: 0.5, width: 0.8 }
                        ],
                        doors: [
                            { wall: 'bottom', pos: 0.5, width: 0.9 }
                        ]
                    },
                    // ── Hallway / corridor ──
                    {
                        name: 'Hallway', type: 'other',
                        width: 18, depth: 1.5, x: 0, z: 6,
                        doors: [
                            { wall: 'top',    pos: 0.08, width: 0.9 },  // front entry
                            { wall: 'bottom', pos: 0.15, width: 0.9 },  // to master bed
                            { wall: 'bottom', pos: 0.45, width: 0.9 },  // to ensuite
                            { wall: 'bottom', pos: 0.65, width: 0.9 },  // to bed 2
                            { wall: 'bottom', pos: 0.85, width: 0.9 }   // to bathroom
                        ]
                    },
                    // ── Rear private zone (z 7.5–13) ──
                    {
                        name: 'Master Bedroom', type: 'bedroom',
                        width: 5.5, depth: 5.5, x: 0, z: 7.5,
                        windows: [
                            { wall: 'bottom', pos: 0.35, width: 1.6 },
                            { wall: 'left',   pos: 0.5,  width: 1.2 }
                        ],
                        doors: [
                            { wall: 'top',   pos: 0.5, width: 0.9 },    // to hallway
                            { wall: 'right', pos: 0.7, width: 0.8 }     // to ensuite
                        ]
                    },
                    {
                        name: 'Ensuite', type: 'bathroom',
                        width: 3, depth: 2.5, x: 5.5, z: 7.5,
                        windows: [
                            { wall: 'bottom', pos: 0.5, width: 0.6 }
                        ],
                        doors: [
                            { wall: 'top', pos: 0.5, width: 0.8 }
                        ]
                    },
                    {
                        name: 'Bedroom 2', type: 'bedroom',
                        width: 4.5, depth: 5.5, x: 8.5, z: 7.5,
                        windows: [
                            { wall: 'bottom', pos: 0.5, width: 1.4 }
                        ],
                        doors: [
                            { wall: 'top', pos: 0.5, width: 0.9 }
                        ]
                    },
                    {
                        name: 'Bathroom', type: 'bathroom',
                        width: 3, depth: 2.5, x: 13, z: 7.5,
                        windows: [
                            { wall: 'right', pos: 0.5, width: 0.7 }
                        ],
                        doors: [
                            { wall: 'top', pos: 0.5, width: 0.8 }
                        ]
                    },
                    {
                        name: 'WC', type: 'bathroom',
                        width: 2, depth: 2.5, x: 16, z: 7.5,
                        doors: [
                            { wall: 'top', pos: 0.5, width: 0.7 }
                        ]
                    }
                ]
            }]
        },

        // ── TRADITIONAL HOME ──────────────────────────────────────────────────
        // 22 × 16 m · 2 floors · pitched roof · symmetrical Georgian-style
        // GF: entry hall centre, living left, dining right, kitchen rear-left,
        //     garage rear-right, WC + utility rear-centre
        // FF: landing, master suite, 3 bedrooms, 2 bathrooms
        traditional: {
            name: 'Traditional Home',
            totalWidth: 22, totalDepth: 16,
            type: 'residential', style: 'traditional',
            specifications: { roofType: 'pitched', floorHeight: 2.8 },
            floors: [
                {
                    level: 1, name: 'Ground Floor', height: 2.8,
                    rooms: [
                        // ── Entry hall (centre-front) ──
                        {
                            name: 'Entry Hall', type: 'other',
                            width: 4, depth: 4, x: 9, z: 0,
                            windows: [
                                { wall: 'top', pos: 0.5, width: 0.6 }   // fanlight
                            ],
                            doors: [
                                { wall: 'top',    pos: 0.5, width: 1.0 }, // front door
                                { wall: 'left',   pos: 0.5, width: 0.9 }, // to living
                                { wall: 'right',  pos: 0.5, width: 0.9 }, // to dining
                                { wall: 'bottom', pos: 0.5, width: 0.9 }  // to staircase
                            ]
                        },
                        // ── Staircase (centre) ──
                        {
                            name: 'Staircase', type: 'staircase',
                            width: 4, depth: 4, x: 9, z: 4,
                            doors: [
                                { wall: 'left',  pos: 0.5, width: 0.9 }, // to kitchen
                                { wall: 'right', pos: 0.5, width: 0.9 }  // to WC
                            ]
                        },
                        // ── Living room (left-front) ──
                        {
                            name: 'Living Room', type: 'living',
                            width: 9, depth: 7, x: 0, z: 0,
                            windows: [
                                { wall: 'top',  pos: 0.3, width: 1.6 },
                                { wall: 'top',  pos: 0.7, width: 1.6 },
                                { wall: 'left', pos: 0.5, width: 1.4 }
                            ],
                            doors: [
                                { wall: 'right',  pos: 0.4, width: 0.9 }, // to hall
                                { wall: 'bottom', pos: 0.5, width: 0.9 }  // to dining/rear
                            ]
                        },
                        // ── Dining room (right-front) ──
                        {
                            name: 'Dining Room', type: 'dining',
                            width: 9, depth: 7, x: 13, z: 0,
                            windows: [
                                { wall: 'top',   pos: 0.3, width: 1.6 },
                                { wall: 'top',   pos: 0.7, width: 1.6 },
                                { wall: 'right', pos: 0.5, width: 1.4 }
                            ],
                            doors: [
                                { wall: 'left',   pos: 0.4, width: 0.9 }, // to hall
                                { wall: 'bottom', pos: 0.5, width: 0.9 }  // to kitchen
                            ]
                        },
                        // ── Kitchen (rear-left) ──
                        {
                            name: 'Kitchen', type: 'kitchen',
                            width: 9, depth: 5, x: 0, z: 7,
                            windows: [
                                { wall: 'bottom', pos: 0.3, width: 1.4 },
                                { wall: 'bottom', pos: 0.7, width: 1.4 },
                                { wall: 'left',   pos: 0.5, width: 1.0 }
                            ],
                            doors: [
                                { wall: 'top',   pos: 0.5, width: 0.9 }, // to staircase area
                                { wall: 'right', pos: 0.5, width: 0.9 }  // to utility
                            ]
                        },
                        // ── WC (rear-centre) ──
                        {
                            name: 'WC / Cloakroom', type: 'bathroom',
                            width: 2.5, depth: 2.5, x: 9, z: 8,
                            doors: [
                                { wall: 'top', pos: 0.5, width: 0.7 }
                            ]
                        },
                        // ── Utility (rear-centre lower) ──
                        {
                            name: 'Utility Room', type: 'other',
                            width: 3.5, depth: 2.5, x: 9, z: 10.5,
                            windows: [
                                { wall: 'bottom', pos: 0.5, width: 0.8 }
                            ],
                            doors: [
                                { wall: 'right', pos: 0.5, width: 0.9 }
                            ]
                        },
                        // ── Garage (rear-right) ──
                        {
                            name: 'Garage', type: 'garage',
                            width: 9, depth: 5, x: 13, z: 7,
                            windows: [
                                { wall: 'right', pos: 0.5, width: 1.0 }
                            ],
                            doors: [
                                { wall: 'top',    pos: 0.5, width: 0.9 }, // to dining area
                                { wall: 'bottom', pos: 0.5, width: 2.4 }  // garage door
                            ]
                        }
                    ]
                },
                {
                    level: 2, name: 'First Floor', height: 2.8,
                    rooms: [
                        // ── Landing ──
                        {
                            name: 'Landing', type: 'staircase',
                            width: 4, depth: 3, x: 9, z: 0,
                            doors: [
                                { wall: 'left',   pos: 0.5, width: 0.9 },
                                { wall: 'right',  pos: 0.5, width: 0.9 },
                                { wall: 'bottom', pos: 0.5, width: 0.9 }
                            ]
                        },
                        // ── Master bedroom (left-front) ──
                        {
                            name: 'Master Bedroom', type: 'bedroom',
                            width: 9, depth: 6, x: 0, z: 0,
                            windows: [
                                { wall: 'top',  pos: 0.3, width: 1.6 },
                                { wall: 'top',  pos: 0.7, width: 1.6 },
                                { wall: 'left', pos: 0.5, width: 1.2 }
                            ],
                            doors: [
                                { wall: 'right',  pos: 0.4, width: 0.9 }, // to landing
                                { wall: 'bottom', pos: 0.8, width: 0.8 }  // to ensuite
                            ]
                        },
                        // ── Ensuite ──
                        {
                            name: 'Ensuite', type: 'bathroom',
                            width: 4, depth: 3, x: 0, z: 6,
                            windows: [
                                { wall: 'left', pos: 0.5, width: 0.7 }
                            ],
                            doors: [
                                { wall: 'top', pos: 0.5, width: 0.8 }
                            ]
                        },
                        // ── Bedroom 2 (right-front) ──
                        {
                            name: 'Bedroom 2', type: 'bedroom',
                            width: 9, depth: 6, x: 13, z: 0,
                            windows: [
                                { wall: 'top',   pos: 0.3, width: 1.6 },
                                { wall: 'top',   pos: 0.7, width: 1.6 },
                                { wall: 'right', pos: 0.5, width: 1.2 }
                            ],
                            doors: [
                                { wall: 'left', pos: 0.4, width: 0.9 }
                            ]
                        },
                        // ── Bedroom 3 (left-rear) ──
                        {
                            name: 'Bedroom 3', type: 'bedroom',
                            width: 6, depth: 5, x: 0, z: 9,
                            windows: [
                                { wall: 'bottom', pos: 0.5, width: 1.4 },
                                { wall: 'left',   pos: 0.5, width: 1.0 }
                            ],
                            doors: [
                                { wall: 'right', pos: 0.5, width: 0.9 }
                            ]
                        },
                        // ── Family bathroom (centre-rear) ──
                        {
                            name: 'Family Bathroom', type: 'bathroom',
                            width: 5, depth: 3.5, x: 9, z: 3,
                            windows: [
                                { wall: 'right', pos: 0.5, width: 0.7 }
                            ],
                            doors: [
                                { wall: 'top', pos: 0.5, width: 0.8 }
                            ]
                        },
                        // ── Bedroom 4 (right-rear) ──
                        {
                            name: 'Bedroom 4', type: 'bedroom',
                            width: 6, depth: 5, x: 16, z: 9,
                            windows: [
                                { wall: 'bottom', pos: 0.5, width: 1.4 },
                                { wall: 'right',  pos: 0.5, width: 1.0 }
                            ],
                            doors: [
                                { wall: 'left', pos: 0.5, width: 0.9 }
                            ]
                        }
                    ]
                }
            ]
        },

        // ── MINIMALIST HOME ───────────────────────────────────────────────────
        // 16 × 11 m · 1 floor · flat roof · fewest walls, max glazing
        // One single open-plan spine across the full front
        // Two bedrooms + bathroom slip behind a single flush partition
        minimalist: {
            name: 'Minimalist Home',
            totalWidth: 16, totalDepth: 11,
            type: 'residential', style: 'minimalist',
            specifications: { roofType: 'flat', floorHeight: 3.2 },
            floors: [{
                level: 1, name: 'Ground Floor', height: 3.2,
                rooms: [
                    // ── Open-plan (full front width) ──
                    {
                        name: 'Open Living · Dining · Kitchen', type: 'living',
                        width: 16, depth: 6.5, x: 0, z: 0,
                        windows: [
                            { wall: 'top',   pos: 0.15, width: 2.4 }, // floor-to-ceiling bays
                            { wall: 'top',   pos: 0.45, width: 2.4 },
                            { wall: 'top',   pos: 0.75, width: 2.4 },
                            { wall: 'left',  pos: 0.5,  width: 1.8 },
                            { wall: 'right', pos: 0.5,  width: 1.8 }
                        ],
                        doors: [
                            { wall: 'top',    pos: 0.05, width: 1.0 }, // main entry
                            { wall: 'bottom', pos: 0.35, width: 0.9 }, // to master bed
                            { wall: 'bottom', pos: 0.72, width: 0.9 }  // to bed 2 / bath
                        ]
                    },
                    // ── Master bedroom (rear-left) ──
                    {
                        name: 'Master Bedroom', type: 'bedroom',
                        width: 6.5, depth: 4.5, x: 0, z: 6.5,
                        windows: [
                            { wall: 'bottom', pos: 0.4, width: 1.8 },
                            { wall: 'left',   pos: 0.5, width: 1.2 }
                        ],
                        doors: [
                            { wall: 'top',   pos: 0.5, width: 0.9 },
                            { wall: 'right', pos: 0.7, width: 0.8 }  // to ensuite
                        ]
                    },
                    // ── Ensuite (rear, behind master) ──
                    {
                        name: 'Ensuite', type: 'bathroom',
                        width: 3, depth: 4.5, x: 6.5, z: 6.5,
                        windows: [
                            { wall: 'bottom', pos: 0.5, width: 0.6 }
                        ],
                        doors: [
                            { wall: 'top', pos: 0.5, width: 0.8 }
                        ]
                    },
                    // ── Bedroom 2 (rear-right) ──
                    {
                        name: 'Bedroom 2', type: 'bedroom',
                        width: 6.5, depth: 4.5, x: 9.5, z: 6.5,
                        windows: [
                            { wall: 'bottom', pos: 0.5, width: 1.6 },
                            { wall: 'right',  pos: 0.5, width: 1.0 }
                        ],
                        doors: [
                            { wall: 'top', pos: 0.5, width: 0.9 }
                        ]
                    }
                ]
            }]
        },

        // ── LUXURY VILLA ──────────────────────────────────────────────────────
        // 28 × 22 m · 2 floors · hip roof · grand classical proportions
        // GF: grand foyer, formal living, library, formal dining,
        //     chef's kitchen + scullery, family room, WC, service wing
        // FF: master suite + dressing + ensuite, 3 bedrooms each with ensuite,
        //     study, sitting room
        villa: {
            name: 'Luxury Villa',
            totalWidth: 28, totalDepth: 22,
            type: 'residential', style: 'luxury',
            specifications: { roofType: 'hip', floorHeight: 3.5 },
            floors: [
                {
                    level: 1, name: 'Ground Floor', height: 3.5,
                    rooms: [
                        // ── Grand foyer (centre-front) ──
                        {
                            name: 'Grand Foyer', type: 'other',
                            width: 6, depth: 5, x: 11, z: 0,
                            windows: [
                                { wall: 'top', pos: 0.25, width: 0.8 },
                                { wall: 'top', pos: 0.75, width: 0.8 }
                            ],
                            doors: [
                                { wall: 'top',    pos: 0.5,  width: 1.2 }, // grand entrance
                                { wall: 'left',   pos: 0.5,  width: 1.0 }, // to formal living
                                { wall: 'right',  pos: 0.5,  width: 1.0 }, // to library
                                { wall: 'bottom', pos: 0.5,  width: 1.0 }  // to staircase
                            ]
                        },
                        // ── Grand staircase ──
                        {
                            name: 'Grand Staircase', type: 'staircase',
                            width: 6, depth: 5, x: 11, z: 5,
                            doors: [
                                { wall: 'left',   pos: 0.5, width: 1.0 },
                                { wall: 'right',  pos: 0.5, width: 1.0 },
                                { wall: 'bottom', pos: 0.5, width: 1.0 }
                            ]
                        },
                        // ── Formal living room (left-front) ──
                        {
                            name: 'Formal Living Room', type: 'living',
                            width: 11, depth: 8, x: 0, z: 0,
                            windows: [
                                { wall: 'top',  pos: 0.25, width: 2.0 },
                                { wall: 'top',  pos: 0.65, width: 2.0 },
                                { wall: 'left', pos: 0.4,  width: 1.8 },
                                { wall: 'left', pos: 0.75, width: 1.8 }
                            ],
                            doors: [
                                { wall: 'right',  pos: 0.3, width: 1.0 }, // to foyer
                                { wall: 'bottom', pos: 0.5, width: 1.0 }  // to formal dining
                            ]
                        },
                        // ── Library / study (right-front) ──
                        {
                            name: 'Library', type: 'office',
                            width: 11, depth: 8, x: 17, z: 0,
                            windows: [
                                { wall: 'top',   pos: 0.25, width: 2.0 },
                                { wall: 'top',   pos: 0.65, width: 2.0 },
                                { wall: 'right', pos: 0.4,  width: 1.8 },
                                { wall: 'right', pos: 0.75, width: 1.8 }
                            ],
                            doors: [
                                { wall: 'left',   pos: 0.3, width: 1.0 }, // to foyer
                                { wall: 'bottom', pos: 0.5, width: 1.0 }  // to family room
                            ]
                        },
                        // ── Formal dining (left-rear) ──
                        {
                            name: 'Formal Dining Room', type: 'dining',
                            width: 8, depth: 6, x: 0, z: 8,
                            windows: [
                                { wall: 'left',   pos: 0.5, width: 1.8 },
                                { wall: 'bottom', pos: 0.5, width: 1.6 }
                            ],
                            doors: [
                                { wall: 'top',   pos: 0.5, width: 1.0 }, // to living
                                { wall: 'right', pos: 0.5, width: 1.0 }  // to kitchen
                            ]
                        },
                        // ── Chef's kitchen (centre-rear) ──
                        {
                            name: "Chef's Kitchen", type: 'kitchen',
                            width: 8, depth: 6, x: 8, z: 8,
                            windows: [
                                { wall: 'bottom', pos: 0.3, width: 1.4 },
                                { wall: 'bottom', pos: 0.7, width: 1.4 }
                            ],
                            doors: [
                                { wall: 'top',   pos: 0.5, width: 1.0 }, // to staircase area
                                { wall: 'right', pos: 0.5, width: 0.9 }  // to scullery
                            ]
                        },
                        // ── Scullery / back kitchen (centre-rear) ──
                        {
                            name: 'Scullery', type: 'kitchen',
                            width: 4, depth: 3.5, x: 16, z: 8,
                            windows: [
                                { wall: 'bottom', pos: 0.5, width: 0.8 }
                            ],
                            doors: [
                                { wall: 'top',   pos: 0.5, width: 0.9 },
                                { wall: 'right', pos: 0.5, width: 0.9 }
                            ]
                        },
                        // ── Family / casual living (right-rear) ──
                        {
                            name: 'Family Room', type: 'living',
                            width: 8, depth: 6, x: 20, z: 8,
                            windows: [
                                { wall: 'right',  pos: 0.4, width: 1.8 },
                                { wall: 'right',  pos: 0.75,width: 1.8 },
                                { wall: 'bottom', pos: 0.5, width: 1.6 }
                            ],
                            doors: [
                                { wall: 'top',  pos: 0.5, width: 1.0 }, // to library
                                { wall: 'left', pos: 0.5, width: 0.9 }  // to scullery
                            ]
                        },
                        // ── Guest WC (centre) ──
                        {
                            name: 'Guest WC', type: 'bathroom',
                            width: 3, depth: 2.5, x: 11, z: 10,
                            doors: [
                                { wall: 'top', pos: 0.5, width: 0.8 }
                            ]
                        },
                        // ── Service / utility wing (rear-strip) ──
                        {
                            name: 'Utility & Laundry', type: 'other',
                            width: 8, depth: 4, x: 0, z: 14,
                            windows: [
                                { wall: 'left',   pos: 0.5, width: 1.0 },
                                { wall: 'bottom', pos: 0.5, width: 1.0 }
                            ],
                            doors: [
                                { wall: 'top',    pos: 0.5, width: 0.9 },
                                { wall: 'bottom', pos: 0.5, width: 1.0 } // service entrance
                            ]
                        },
                        // ── Staff / guest quarters (rear-right) ──
                        {
                            name: 'Staff Room', type: 'bedroom',
                            width: 6, depth: 4, x: 20, z: 14,
                            windows: [
                                { wall: 'right',  pos: 0.5, width: 1.2 },
                                { wall: 'bottom', pos: 0.5, width: 1.0 }
                            ],
                            doors: [
                                { wall: 'top',  pos: 0.5, width: 0.9 },
                                { wall: 'left', pos: 0.5, width: 0.8 }
                            ]
                        }
                    ]
                },
                {
                    level: 2, name: 'First Floor', height: 3.5,
                    rooms: [
                        // ── Upper landing ──
                        {
                            name: 'Upper Landing', type: 'staircase',
                            width: 6, depth: 4, x: 11, z: 0,
                            doors: [
                                { wall: 'left',   pos: 0.5, width: 1.0 },
                                { wall: 'right',  pos: 0.5, width: 1.0 },
                                { wall: 'bottom', pos: 0.5, width: 1.0 }
                            ]
                        },
                        // ── Master suite (left-front) ──
                        {
                            name: 'Master Bedroom Suite', type: 'bedroom',
                            width: 11, depth: 8, x: 0, z: 0,
                            windows: [
                                { wall: 'top',  pos: 0.25, width: 2.2 },
                                { wall: 'top',  pos: 0.65, width: 2.2 },
                                { wall: 'left', pos: 0.5,  width: 1.8 }
                            ],
                            doors: [
                                { wall: 'right',  pos: 0.3, width: 1.0 }, // to landing
                                { wall: 'bottom', pos: 0.25,width: 0.9 }, // to dressing room
                                { wall: 'bottom', pos: 0.75,width: 0.9 }  // to master ensuite
                            ]
                        },
                        // ── Dressing room ──
                        {
                            name: 'Dressing Room', type: 'other',
                            width: 5, depth: 4, x: 0, z: 8,
                            doors: [
                                { wall: 'top',   pos: 0.5, width: 0.9 },
                                { wall: 'right', pos: 0.5, width: 0.8 }
                            ]
                        },
                        // ── Master ensuite ──
                        {
                            name: 'Master Ensuite', type: 'bathroom',
                            width: 6, depth: 4, x: 5, z: 8,
                            windows: [
                                { wall: 'left',   pos: 0.5, width: 0.8 },
                                { wall: 'bottom', pos: 0.5, width: 0.8 }
                            ],
                            doors: [
                                { wall: 'top', pos: 0.5, width: 0.9 }
                            ]
                        },
                        // ── Sitting room / upstairs lounge (right-front) ──
                        {
                            name: 'Sitting Room', type: 'living',
                            width: 11, depth: 8, x: 17, z: 0,
                            windows: [
                                { wall: 'top',   pos: 0.25, width: 2.2 },
                                { wall: 'top',   pos: 0.65, width: 2.2 },
                                { wall: 'right', pos: 0.5,  width: 1.8 }
                            ],
                            doors: [
                                { wall: 'left', pos: 0.3, width: 1.0 }
                            ]
                        },
                        // ── Bedroom 2 with ensuite (left-rear) ──
                        {
                            name: 'Bedroom 2', type: 'bedroom',
                            width: 8, depth: 6, x: 0, z: 12,
                            windows: [
                                { wall: 'left',   pos: 0.5, width: 1.6 },
                                { wall: 'bottom', pos: 0.5, width: 1.6 }
                            ],
                            doors: [
                                { wall: 'right', pos: 0.3, width: 0.9 },
                                { wall: 'right', pos: 0.75,width: 0.8 }  // to ensuite
                            ]
                        },
                        {
                            name: 'Ensuite 2', type: 'bathroom',
                            width: 3.5, depth: 3, x: 8, z: 12,
                            doors: [{ wall: 'left', pos: 0.5, width: 0.8 }]
                        },
                        // ── Bedroom 3 with ensuite (centre-rear) ──
                        {
                            name: 'Bedroom 3', type: 'bedroom',
                            width: 8, depth: 6, x: 11, z: 12,
                            windows: [
                                { wall: 'bottom', pos: 0.5, width: 1.6 }
                            ],
                            doors: [
                                { wall: 'top',   pos: 0.3, width: 0.9 },
                                { wall: 'right', pos: 0.7, width: 0.8 }
                            ]
                        },
                        {
                            name: 'Ensuite 3', type: 'bathroom',
                            width: 3.5, depth: 3, x: 19, z: 12,
                            doors: [{ wall: 'left', pos: 0.5, width: 0.8 }]
                        },
                        // ── Bedroom 4 with ensuite (right-rear) ──
                        {
                            name: 'Bedroom 4', type: 'bedroom',
                            width: 5, depth: 6, x: 23, z: 12,
                            windows: [
                                { wall: 'right',  pos: 0.5, width: 1.4 },
                                { wall: 'bottom', pos: 0.5, width: 1.2 }
                            ],
                            doors: [
                                { wall: 'top',  pos: 0.5, width: 0.9 },
                                { wall: 'left', pos: 0.7, width: 0.8 }
                            ]
                        },
                        {
                            name: 'Ensuite 4', type: 'bathroom',
                            width: 3.5, depth: 3, x: 23, z: 9,
                            doors: [{ wall: 'bottom', pos: 0.5, width: 0.8 }]
                        }
                    ]
                }
            ]
        }
    };

    const template = templates[templateType];
    if (!template) return;

    // Ensure every room has doors/windows arrays (safety net)
    if (template.floors) {
        template.floors.forEach(floor => {
            if (floor.rooms) {
                floor.rooms.forEach(room => {
                    if (!room.doors)   room.doors   = [];
                    if (!room.windows) room.windows = [];
                    if (!room.height)  room.height  = floor.height || 2.8;
                });
            }
        });
    }

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
    const totalArea     = projects.reduce((sum, p) => sum + (p.metadata?.totalArea || 0), 0);
    const totalRooms    = projects.reduce((sum, p) => sum + (p.metadata?.totalRooms || 0), 0);
    const totalValue    = projects.reduce((sum, p) => sum + (p.metadata?.estimatedCost || 0), 0);

    const el = id => document.getElementById(id);
    if (el('totalProjects')) el('totalProjects').textContent = totalProjects;
    if (el('totalAreaStat')) el('totalAreaStat').textContent = totalArea.toLocaleString();
    if (el('totalRoomsStat'))el('totalRoomsStat').textContent = totalRooms;
    if (el('totalValue'))    el('totalValue').textContent = '$' + totalValue.toLocaleString();
}

async function loadUserProfile() {
    try {
        const data = await api.getProfile();
        const user = data.user;
        const el = id => document.getElementById(id);
        if (el('profileName'))    el('profileName').value    = user.name    || '';
        if (el('profileEmail'))   el('profileEmail').value   = user.email   || '';
        if (el('profileCompany')) el('profileCompany').value = user.company || '';
        if (el('profilePhone'))   el('profilePhone').value   = user.phone   || '';
        // Sync overview tab
        if (window.populateProfileOverview) populateProfileOverview();
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}

async function updateProfile(event) {
    event.preventDefault();
    const profileData = {
        name:    document.getElementById('profileName').value,
        email:   document.getElementById('profileEmail').value,
        company: document.getElementById('profileCompany').value,
        phone:   document.getElementById('profilePhone').value,
    };
    try {
        showLoading('Updating profile...');
        await api.updateProfile(profileData);
        // Update cached user name
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                Object.assign(user, profileData);
                localStorage.setItem('user', JSON.stringify(user));
            } catch (e) { /* ignore */ }
        }
        hideLoading();
        showToast('Profile updated!', 'success');
        loadUserInfo();
    } catch (error) {
        hideLoading();
        showToast(error.message || 'Update failed', 'error');
    }
}

// Close modals on backdrop click
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
});

function initPasswordValidation() {
    newPasswordEl = document.getElementById("newPassword");
    confirmPasswordEl = document.getElementById("confirmPassword");

    if (!newPasswordEl || !confirmPasswordEl) return;

    function checkMatch() {
        const newVal = newPasswordEl.value;
        const confirmVal = confirmPasswordEl.value;

        confirmPasswordEl.classList.remove("input-success", "input-error");

        if (confirmVal === "") return;

        if (newVal === confirmVal) {
            confirmPasswordEl.classList.add("input-success"); // ✅ green
        } else {
            confirmPasswordEl.classList.add("input-error"); // ❌ red
        }
    }

    newPasswordEl.addEventListener("input", checkMatch);
    confirmPasswordEl.addEventListener("input", checkMatch);
}
// ═══════════════════════════════════════════════════════════════════════════════
// SUPPORT CHAT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════


const TICKET_API = 'http://localhost:5000/api/tickets';
let chatState = {
    tickets: [],
    activeId: null,
    composing: false
};

// ── Auth header helper ────────────────────────────────────────────────────────
function chatHeaders() {
    const token = localStorage.getItem('token');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

// ── Get user data from localStorage (set on login) ───────────────────────────
function getChatUser() {
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : {};
    } catch(e) { return {}; }
}

// ── Unread badge polling ──────────────────────────────────────────────────────
function startUserTicketPolling() {
    pollUserUnread();
    setInterval(pollUserUnread, 60000);
}

async function pollUserUnread() {
    try {
        const res = await fetch(`${TICKET_API}/my/unread`, { headers: chatHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const badge = document.getElementById('userMsgBadge');
        if (!badge) return;
        if (data.count > 0) {
            badge.textContent = data.count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    } catch(e) {}
}

// ── Load tickets and render sidebar list ─────────────────────────────────────
async function loadUserTickets() {
    const listEl = document.getElementById('chatThreadList');
    if (!listEl) return;
    listEl.innerHTML = '<div class="chat-list-loading"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const res = await fetch(`${TICKET_API}/my`, { headers: chatHeaders() });
        const data = await res.json();
        if (!data.success) { listEl.innerHTML = '<div class="chat-list-empty"><i class="fas fa-exclamation-circle"></i><p>Failed to load</p></div>'; return; }

        chatState.tickets = data.tickets;
        renderChatList();

        // Clear unread badge
        const badge = document.getElementById('userMsgBadge');
        if (badge) badge.style.display = 'none';

        // If coming back to an active ticket, refresh it
        if (chatState.activeId) {
            const t = chatState.tickets.find(t => t._id === chatState.activeId);
            if (t) renderThreadView(t);
        }
    } catch(e) {
        listEl.innerHTML = '<div class="chat-list-empty"><i class="fas fa-wifi"></i><p>Network error</p></div>';
    }
}

function renderChatList() {
    const listEl = document.getElementById('chatThreadList');
    if (!listEl) return;

    if (!chatState.tickets.length) {
        listEl.innerHTML = `<div class="chat-list-empty">
            <i class="fas fa-comment-slash"></i>
            <p>No conversations yet.<br>Tap the pencil to start one.</p>
        </div>`;
        return;
    }

    const statusColors = { new: '#f59e0b', seen: '#3b82f6', replied: '#10b981', closed: '#64748b' };

    listEl.innerHTML = chatState.tickets.map(t => {
        const unread  = !t.userRead && t.replies.length > 0;
        const color   = statusColors[t.status] || '#64748b';
        const preview = t.replies.length
            ? t.replies[t.replies.length - 1].message
            : t.message;
        const time = relativeTime(t.updatedAt || t.createdAt);
        const isActive = t._id === chatState.activeId;

        return `<div class="chat-list-item ${unread ? 'unread' : ''} ${isActive ? 'active' : ''}"
            onclick="openChatThread('${t._id}')" data-tid="${t._id}">
            <div class="chat-list-item-subject">
                ${unread ? '<span class="chat-unread-dot"></span>' : ''}
                ${escHtml(t.subject)}
            </div>
            <div class="chat-list-item-meta">
                <span class="chat-list-item-preview">${escHtml(preview.slice(0, 55))}${preview.length > 55 ? '…' : ''}</span>
                <span class="chat-list-time">${time}</span>
            </div>
            <span class="chat-status-pill" style="background:${color}22;color:${color};border:1px solid ${color}44;">${t.status}</span>
        </div>`;
    }).join('');
}

// ── Open a thread ─────────────────────────────────────────────────────────────
function openChatThread(id) {
    chatState.activeId = id;
    const ticket = chatState.tickets.find(t => t._id === id);
    if (!ticket) return;

    // Update sidebar active state
    document.querySelectorAll('.chat-list-item').forEach(el => el.classList.remove('active'));
    const item = document.querySelector(`.chat-list-item[data-tid="${id}"]`);
    if (item) item.classList.add('active');

    hideComposePanel(false);
    renderThreadView(ticket);
}

function renderThreadView(ticket) {
    const emptyEl   = document.getElementById('chatEmptyState');
    const composeEl = document.getElementById('chatComposePanel');
    const threadEl  = document.getElementById('chatThreadView');
    if (emptyEl)   emptyEl.style.display   = 'none';
    if (composeEl) composeEl.style.display = 'none';
    if (threadEl)  threadEl.style.display  = 'flex';

    // Header
    const statusColors = { new: '#f59e0b', seen: '#3b82f6', replied: '#10b981', closed: '#64748b' };
    const color = statusColors[ticket.status] || '#64748b';
    const subjectEl = document.getElementById('chatThreadSubject');
    const metaEl    = document.getElementById('chatThreadMeta');
    const statusEl  = document.getElementById('chatThreadStatus');
    if (subjectEl) subjectEl.textContent = ticket.subject;
    if (metaEl)    metaEl.textContent    = `${ticket.category} · ${new Date(ticket.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
    if (statusEl)  statusEl.innerHTML    = `<span class="chat-status-pill" style="background:${color}22;color:${color};border:1px solid ${color}44;">${ticket.status}</span>`;

    // Show/hide reply box vs closed notice
    const replyBox     = document.getElementById('chatReplyBox');
    const closedNotice = document.getElementById('chatClosedNotice');
    if (ticket.status === 'closed') {
        if (replyBox)     replyBox.style.display     = 'none';
        if (closedNotice) closedNotice.style.display = 'flex';
    } else {
        if (replyBox)     replyBox.style.display     = 'flex';
        if (closedNotice) closedNotice.style.display = 'none';
    }

    // Build messages
    const allMsgs = [
        { sender: 'user', senderName: ticket.name, message: ticket.message, createdAt: ticket.createdAt },
        ...ticket.replies
    ];

    const msgsEl = document.getElementById('chatMessages');
    if (msgsEl) {
        msgsEl.innerHTML = allMsgs.map(msg => {
            const isAdmin = msg.sender === 'admin';
            const rowClass = isAdmin ? 'from-admin' : 'from-user';
            const senderLabel = isAdmin ? '🛡 SmartArch Support' : '👤 You';
            const time = new Date(msg.createdAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
            return `<div class="chat-bubble-row ${rowClass}">
                <span class="chat-bubble-sender">${senderLabel}</span>
                <div class="chat-bubble">${escHtml(msg.message)}</div>
                <span class="chat-bubble-time">${time}</span>
            </div>`;
        }).join('');
        // Scroll to bottom
        setTimeout(() => { msgsEl.scrollTop = msgsEl.scrollHeight; }, 30);
    }
}

// ── Compose Panel ─────────────────────────────────────────────────────────────
function showComposePanel() {
    chatState.composing = true;

    // Hide other panels
    const emptyEl  = document.getElementById('chatEmptyState');
    const threadEl = document.getElementById('chatThreadView');
    const composeEl= document.getElementById('chatComposePanel');
    if (emptyEl)   emptyEl.style.display   = 'none';
    if (threadEl)  threadEl.style.display  = 'none';
    if (composeEl) composeEl.style.display = 'flex';

    // Deselect active thread
    document.querySelectorAll('.chat-list-item').forEach(el => el.classList.remove('active'));
    chatState.activeId = null;

    // Auto-fill from user session — user can edit before sending
    const user = getChatUser();
    const nameEl    = document.getElementById('composeFrom');
    const emailEl   = document.getElementById('composeEmail');
    const companyEl = document.getElementById('composeCompany');

    if (nameEl    && !nameEl.value)    nameEl.value    = user.name    || '';
    if (emailEl   && !emailEl.value)   emailEl.value   = user.email   || '';
    if (companyEl && !companyEl.value) companyEl.value = user.company || '';

    // Wire char counter
    const msgEl = document.getElementById('composeMessage');
    const cntEl = document.getElementById('composeCharCount');
    if (msgEl && cntEl) {
        msgEl.oninput = () => { cntEl.textContent = msgEl.value.length; };
        msgEl.value = '';
        cntEl.textContent = '0';
    }

    // Focus subject
    setTimeout(() => { const s = document.getElementById('composeSubject'); if (s) s.focus(); }, 80);
}

function hideComposePanel(showEmpty = true) {
    chatState.composing = false;
    const composeEl = document.getElementById('chatComposePanel');
    const emptyEl   = document.getElementById('chatEmptyState');
    const threadEl  = document.getElementById('chatThreadView');
    if (composeEl) composeEl.style.display = 'none';
    if (showEmpty && !chatState.activeId) {
        if (emptyEl)  emptyEl.style.display  = 'flex';
        if (threadEl) threadEl.style.display = 'none';
    }
}

async function submitComposeForm() {
    const name     = (document.getElementById('composeFrom')?.value || '').trim();
    const email    = (document.getElementById('composeEmail')?.value || '').trim();
    const company  = (document.getElementById('composeCompany')?.value || '').trim();
    const subject  = document.getElementById('composeSubject')?.value || '';
    const category = subject; // subject IS the category now
    const message  = (document.getElementById('composeMessage')?.value || '').trim();

    // Validate
    const errs = [];
    if (!name)                                             errs.push('Name is required.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('Valid email is required.');
    if (!subject)  errs.push('Please select a subject.');
    if (!message || message.length < 10)                   errs.push('Message must be at least 10 characters.');
    if (errs.length) { showDashToast(errs[0], 'error'); return; }

    const btn = document.getElementById('composeSendBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…'; }

    try {
        const res = await fetch(TICKET_API, {
            method: 'POST',
            headers: chatHeaders(),
            body: JSON.stringify({ name, email, company, subject, category, message })
        });
        const data = await res.json();
        if (data.success) {
            showDashToast('Message sent! We\'ll reply soon.', 'success');
            // Clear form
            ['composeSubject','composeMessage'].forEach(id => {
                const el = document.getElementById(id); if (el) el.value = '';
            });
            const cntEl = document.getElementById('composeCharCount');
            if (cntEl) cntEl.textContent = '0';
            // Reload and show new ticket
            await loadUserTickets();
            // Open the newest ticket (first in list)
            if (chatState.tickets.length) openChatThread(chatState.tickets[0]._id);
        } else {
            showDashToast(data.message || 'Failed to send.', 'error');
        }
    } catch(e) {
        showDashToast('Network error. Please try again.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message'; }
    }
}

// ── User reply inside thread ──────────────────────────────────────────────────
async function submitUserReply() {
    const inputEl = document.getElementById('chatReplyInput');
    const message = (inputEl?.value || '').trim();
    if (!message) return;

    const ticket = chatState.tickets.find(t => t._id === chatState.activeId);
    if (!ticket) return;

    const btn = document.querySelector('.chat-reply-send');
    if (btn) btn.disabled = true;

    try {
        // We use the same submit endpoint but append to existing ticket as a follow-up
        // Create a new ticket is intentional UX for follow-ups, but here we send to admin via a new ticket
        // Actually, for a "reply" from user's side we need to POST a new ticket with a reference
        // or we post the message as a new ticket with subject "Re: <original>"
        // Best UX: POST /api/tickets with subject "Re: original" and link
        const user    = getChatUser();
        const subject = ticket.subject.startsWith('Re: ') ? ticket.subject : `Re: ${ticket.subject}`;
        const res = await fetch(TICKET_API, {
            method: 'POST',
            headers: chatHeaders(),
            body: JSON.stringify({
                name: user.name || ticket.name,
                email: user.email || ticket.email,
                company: user.company || ticket.company || '',
                subject,
                category: ticket.category,
                message
            })
        });
        const data = await res.json();
        if (data.success) {
            if (inputEl) inputEl.value = '';
            await loadUserTickets();
            // Open the new ticket
            if (chatState.tickets.length) openChatThread(chatState.tickets[0]._id);
        } else {
            showDashToast(data.message || 'Failed to send reply.', 'error');
        }
    } catch(e) {
        showDashToast('Network error.', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

function handleReplyKeydown(e) {
    // Enter sends, Shift+Enter adds newline
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitUserReply();
    }
}

// ── Mobile: show list ─────────────────────────────────────────────────────────
function showChatListOnMobile() {
    chatState.activeId = null;
    const threadEl  = document.getElementById('chatThreadView');
    const composeEl = document.getElementById('chatComposePanel');
    const emptyEl   = document.getElementById('chatEmptyState');
    const sidebar   = document.getElementById('chatSidebar');
    if (threadEl)  threadEl.style.display  = 'none';
    if (composeEl) composeEl.style.display = 'none';
    if (emptyEl)   emptyEl.style.display   = 'flex';
    if (sidebar)   { sidebar.classList.add('mobile-visible'); }
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function relativeTime(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)   return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function showDashToast(message, type = 'info') {
    // Try using existing toast system
    if (typeof showToast === 'function') { showToast(message, type); return; }
    const container = document.getElementById('toastContainer') || document.body;
    const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6' };
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;background:#0d1424;border:1px solid rgba(255,255,255,0.1);border-left:3px solid ${colors[type]||colors.info};border-radius:10px;padding:0.875rem 1.25rem;color:#f1f5f9;font-size:0.875rem;min-width:260px;box-shadow:0 20px 40px rgba(0,0,0,0.4);animation:slideInRight 0.3s ease;`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ── Start polling ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => { startUserTicketPolling(); });

// ── Expose globals ────────────────────────────────────────────────────────────
window.loadUserTickets     = loadUserTickets;
window.openChatThread      = openChatThread;
window.showComposePanel    = showComposePanel;
window.hideComposePanel    = hideComposePanel;
window.submitComposeForm   = submitComposeForm;
window.submitUserReply     = submitUserReply;
window.handleReplyKeydown  = handleReplyKeydown;
window.showChatListOnMobile= showChatListOnMobile;
window.toggleTicketThread  = function(){};
