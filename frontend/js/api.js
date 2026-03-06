// frontend/js/api.js
// Main backend  (auth + projects) : port 5000
// AI backend   (layout + chat)   : port 3001

const API_BASE_URL    = 'http://localhost:5000/api';
const AI_API_BASE_URL = 'http://localhost:3001/api/architecture';

// ─────────────────────────────────────────────
//  Main API class  (auth + projects + models)
// ─────────────────────────────────────────────
class API {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
    }

    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        return headers;
    }

    async request(endpoint, options = {}) {
        const url    = `${API_BASE_URL}${endpoint}`;
        const config = { ...options, headers: { ...this.getHeaders(), ...options.headers } };

        try {
            const response = await fetch(url, config);
            const data     = await response.json();
            if (!response.ok) throw new Error(data.message || 'Something went wrong');
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ── Auth ──────────────────────────────────────
    async register(userData) {
        return this.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
    }

    async login(credentials) {
        return this.request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    }

    async getProfile() {
        return this.request('/auth/me');
    }

    async updateProfile(profileData) {
        return this.request('/auth/profile', { method: 'PUT', body: JSON.stringify(profileData) });
    }

    // ── Projects ──────────────────────────────────
    async getProjects(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/projects${qs ? `?${qs}` : ''}`);
    }

    async getProject(id)                      { return this.request(`/projects/${id}`); }
    async createProject(projectData)          { return this.request('/projects', { method: 'POST', body: JSON.stringify(projectData) }); }
    async updateProject(id, projectData)      { return this.request(`/projects/${id}`, { method: 'PUT',  body: JSON.stringify(projectData) }); }
    async deleteProject(id)                   { return this.request(`/projects/${id}`, { method: 'DELETE' }); }
    async addCollaborator(projectId, data)    { return this.request(`/projects/${projectId}/collaborators`, { method: 'POST', body: JSON.stringify(data) }); }
    async getProjectVersions(projectId)       { return this.request(`/projects/${projectId}/versions`); }
    async restoreVersion(projectId, versionId){ return this.request(`/projects/${projectId}/versions/${versionId}/restore`, { method: 'POST' }); }

    // ── Models ────────────────────────────────────
    async generateFloorPlan(projectId)        { return this.request(`/models/${projectId}/floorplan`, { method: 'POST' }); }
    async generate3DModel(projectId)          { return this.request(`/models/${projectId}/3d`,        { method: 'POST' }); }
    async getModelStats(projectId)            { return this.request(`/models/${projectId}/stats`); }

    async exportModel(projectId, format) {
        const url      = `${API_BASE_URL}/models/${projectId}/export/${format}`;
        const response = await fetch(url, { headers: this.getHeaders() });
        if (!response.ok) throw new Error('Export failed');

        const blob        = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a           = document.createElement('a');
        a.href            = downloadUrl;
        a.download        = `house-model.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
    }
}

// ─────────────────────────────────────────────
//  AI Architecture API  (layout + chat — port 3001)
// ─────────────────────────────────────────────
class ArchitectureAPI {

    /**
     * Generate a building floorplan via the BSP layout engine.
     *
     * @param {object} params
     * @param {string}  params.buildingType   'residential' | 'office' | 'commercial'
     * @param {number}  params.floors         1–6
     * @param {number}  params.totalArea      m² per floor
     * @param {Array}   params.rooms          [{ type, count }]  optional
     * @returns {Promise<{ success, floorplan: { floors: [] } }>}
     */
    async generateFloorplan(params) {
        try {
            const response = await fetch(`${AI_API_BASE_URL}/floorplan/generate`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(params),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Floorplan generation failed');
            return data;
        } catch (error) {
            console.error('ArchitectureAPI.generateFloorplan error:', error);
            throw error;
        }
    }

    /**
     * Upload a floorplan image and extract room layout via edge detection.
     *
     * @param {File}   file          PNG / JPEG / WEBP image File object
     * @param {number} scaleFactor   Pixels per metre (default 20)
     * @returns {Promise<{ success, floorplan: { floors: [] } }>}
     */
    async uploadFloorplanImage(file, scaleFactor = 20) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('scaleFactor', String(scaleFactor));

            const response = await fetch(`${AI_API_BASE_URL}/floorplan/upload-image`, {
                method: 'POST',
                body:   formData,
                // Note: do NOT set Content-Type header — browser sets it with boundary
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Image upload failed');
            return data;
        } catch (error) {
            console.error('ArchitectureAPI.uploadFloorplanImage error:', error);
            throw error;
        }
    }

    /**
     * Send a chat message to the AI architect assistant (Ollama).
     *
     * @param {string} message
     * @returns {Promise<{ success, data: { reply: string } }>}
     */
    async chat(message) {
        try {
            const response = await fetch(`${AI_API_BASE_URL}/chat`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ message }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Chat request failed');
            return data;
        } catch (error) {
            console.error('ArchitectureAPI.chat error:', error);
            throw error;
        }
    }
}

// ─────────────────────────────────────────────
//  Singletons
// ─────────────────────────────────────────────
const api              = new API();
const architectureAPI  = new ArchitectureAPI();

window.api             = api;
window.architectureAPI = architectureAPI;

// ─────────────────────────────────────────────
//  UI Utilities
// ─────────────────────────────────────────────
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast       = document.createElement('div');
    toast.className   = `toast ${type}`;
    toast.innerHTML   = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity   = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoading(message = 'Loading...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay            = document.createElement('div');
        overlay.id         = 'loadingOverlay';
        overlay.style.cssText = `
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,0.5);display:flex;align-items:center;
            justify-content:center;z-index:9999;color:white;font-size:1.2rem;
            flex-direction:column;gap:1rem;
        `;
        overlay.innerHTML  = `<i class="fas fa-spinner fa-spin fa-2x"></i><span id="loadingMsg">${message}</span>`;
        document.body.appendChild(overlay);
    } else {
        document.getElementById('loadingMsg').textContent = message;
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

window.showToast    = showToast;
window.showLoading  = showLoading;
window.hideLoading  = hideLoading;
