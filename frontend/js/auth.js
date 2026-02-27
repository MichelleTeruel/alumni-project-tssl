document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    let currentTab = 'alumni';

    if (tabButtons.length > 0) {
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTab = btn.dataset.tab;
            });
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const isAdmin = currentTab === 'admin';
            
            console.log('Login attempt:', { email, isAdmin, endpoint: isAdmin ? '/admin/login' : '/auth/login' });
            
            try {
                const data = await api.login(email, password, isAdmin);
                console.log('Login success:', data);
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                if (isAdmin) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'home.html';
                }
            } catch (error) {
                console.error('Login error:', error);
                alert(error.message);
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            
            try {
                await api.register(email, password);
                alert('Registration successful! Please login.');
                window.location.href = 'index.html';
            } catch (error) {
                alert(error.message);
            }
        });
    }
});
