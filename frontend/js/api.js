// frontend/js/api.js
// Main backend (auth + projects): port 5000
// AI backend (Ollama/architecture): port 3001
const API_BASE_URL = 'http://localhost:5000/api';

class API {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
    }

    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            ...options,
            headers: { ...this.getHeaders(), ...options.headers }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth
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

    // Projects
    async getProjects(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/projects${queryString ? `?${queryString}` : ''}`);
    }

    async getProject(id) {
        return this.request(`/projects/${id}`);
    }

    async createProject(projectData) {
        return this.request('/projects', { method: 'POST', body: JSON.stringify(projectData) });
    }

    async updateProject(id, projectData) {
        return this.request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(projectData) });
    }

    async deleteProject(id) {
        return this.request(`/projects/${id}`, { method: 'DELETE' });
    }

    async addCollaborator(projectId, data) {
        return this.request(`/projects/${projectId}/collaborators`, { method: 'POST', body: JSON.stringify(data) });
    }

    async getProjectVersions(projectId) {
        return this.request(`/projects/${projectId}/versions`);
    }

    async restoreVersion(projectId, versionId) {
        return this.request(`/projects/${projectId}/versions/${versionId}/restore`, { method: 'POST' });
    }

    // Models
    async generateFloorPlan(projectId) {
        return this.request(`/models/${projectId}/floorplan`, { method: 'POST' });
    }

    async generate3DModel(projectId) {
        return this.request(`/models/${projectId}/3d`, { method: 'POST' });
    }

    async getModelStats(projectId) {
        return this.request(`/models/${projectId}/stats`);
    }

    async exportModel(projectId, format) {
        const url = `${API_BASE_URL}/models/${projectId}/export/${format}`;
        const response = await fetch(url, { headers: this.getHeaders() });
        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `house-model.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
    }
}

const api = new API();
window.api = api;

// Toast Notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoading(message = 'Loading...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 9999; color: white; font-size: 1.2rem;
            flex-direction: column; gap: 1rem;
        `;
        overlay.innerHTML = `<i class="fas fa-spinner fa-spin fa-2x"></i><span id="loadingMsg">${message}</span>`;
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

window.showToast = showToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
