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

        const url = `${API_BASE}${endpoint}`;
        console.log('Full URL:', url);
        console.log('Request config:', config);
        
        const response = await fetch(url, config);
        const data = await response.json();
        
        console.log('API Response:', response.status, data);

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    },

    async register(email, password) {
        return this.request('/auth/register', {
            method: 'POST',
            body: { email, password }
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

    async getSubmissions() {
        return this.request('/admin/submissions');
    },

    async updateSubmissionStatus(id, action) {
        return this.request(`/admin/submissions/${id}/${action}`, {
            method: 'PUT'
        });
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
