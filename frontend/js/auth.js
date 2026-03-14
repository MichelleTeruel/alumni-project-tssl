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
            
            try {
                const data = await api.login(email, password, isAdmin);
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                if (isAdmin) {
                    window.location.href = 'admin-home.html';
                } else {
                    window.location.href = 'home.html';
                }
            } catch (error) {
                alert(error.message);
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const schoolId = document.getElementById('schoolId').value;
            const firstName = document.getElementById('firstName').value;
            const middleName = document.getElementById('middleName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            
            try {
                await api.register({
                    school_id: schoolId,
                    first_name: firstName,
                    middle_name: middleName,
                    last_name: lastName,
                    email: email,
                    password: password
                });
                alert('Registration successful! Please login.');
                window.location.href = 'index.html';
            } catch (error) {
                alert(error.message);
            }
        });
    }
});
