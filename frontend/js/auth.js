document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const roleSelection = document.getElementById('roleSelection');
    const loginSection = document.getElementById('loginSection');
    const loginTitle = document.getElementById('loginTitle');
    const backBtn = document.getElementById('backBtn');
    const registerLink = document.getElementById('registerLink');
    
    let currentRole = null;

    if (roleSelection) {
        const roleCards = document.querySelectorAll('.role-card');
        
        roleCards.forEach(card => {
            card.addEventListener('click', () => {
                const role = card.dataset.role;
                
                if (role === 'alumni') {
                    showLoginForm('alumni');
                } else if (role === 'admin') {
                    showLoginForm('admin');
                } else {
                    alert('This module is not implemented yet.');
                }
            });
        });
    }

    function showLoginForm(role) {
        currentRole = role;
        
        roleSelection.style.display = 'none';
        loginSection.classList.add('visible');
        
        if (role === 'admin') {
            loginTitle.textContent = 'Admin Login';
            registerLink.style.display = 'none';
        } else {
            loginTitle.textContent = 'Alumni Login';
            registerLink.style.display = 'block';
        }
        
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            loginSection.classList.remove('visible');
            roleSelection.style.display = 'grid';
            currentRole = null;
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const isAdmin = currentRole === 'admin';
            
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
                window.location.href = 'guest-view.html';
            } catch (error) {
                alert(error.message);
            }
        });
    }
});
