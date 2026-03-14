const API_BASE = 'http://localhost:8000/api';

const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (options.headers) {
            Object.assign(headers, options.headers);
        }
        
        const config = {
            headers: headers,
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    },

    async register(data) {
        return this.request('/auth/register', {
            method: 'POST',
            body: data
        });
    },

    async login(email, password, isAdmin = false) {
        const endpoint = isAdmin ? '/admin/login' : '/auth/login';
        return this.request(endpoint, {
            method: 'POST',
            body: { email, password }
        });
    },

    async submitTracer(data) {
        return this.request('/tracer/submit', {
            method: 'POST',
            body: data
        });
    },

    async getMySubmission() {
        return this.request('/tracer/my-submission');
    },

    async updateWork(data) {
        return this.request('/tracer/update-work', {
            method: 'PUT',
            body: data
        });
    },

    async requestWorkChange(newWork) {
        return this.request('/tracer/request-work-change', {
            method: 'POST',
            body: { new_work: newWork }
        });
    },

    async getSubmissions() {
        return this.request('/admin/submissions');
    },

    async updateSubmissionStatus(id, action) {
        return this.request(`/admin/submissions/${id}/${action}`, {
            method: 'PUT'
        });
    },

    async updateAlumni(id, data) {
        return this.request(`/admin/alumni/${id}`, {
            method: 'PUT',
            body: data
        });
    },

    async deleteAlumni(id) {
        return this.request(`/admin/alumni/${id}`, {
            method: 'DELETE'
        });
    },

    async getAnnouncements() {
        return this.request('/announcements');
    },

    async createAnnouncement(data) {
        return this.request('/announcements', {
            method: 'POST',
            body: data
        });
    },

    async updateAnnouncement(id, data) {
        return this.request(`/announcements/${id}`, {
            method: 'PUT',
            body: data
        });
    },

    async deleteAnnouncement(id) {
        return this.request(`/announcements/${id}`, {
            method: 'DELETE'
        });
    },

    async getWorkChangeRequests() {
        return this.request('/admin/work-change-requests');
    },

    async updateWorkChangeRequest(id, action) {
        return this.request(`/admin/work-change-requests/${id}/${action}`, {
            method: 'PUT'
        });
    },

    async getAnalytics() {
        return this.request('/admin/analytics');
    },

    async getApprovedAlumni() {
        return this.request('/alumni/approved');
    }
};

const auth = {
    getUser() {
        const token = localStorage.getItem('token');
        if (!token) return null;
        try {
            return JSON.parse(atob(token));
        } catch {
            return null;
        }
    },

    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    },

    isAlumni() {
        const user = this.getUser();
        return user && user.role === 'alumni';
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    },

    requireAuth() {
        const user = this.getUser();
        if (!user) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },

    requireAdmin() {
        if (!this.requireAuth() || !this.isAdmin()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
};
