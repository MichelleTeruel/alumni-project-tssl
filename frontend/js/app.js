document.addEventListener('DOMContentLoaded', () => {
    const tracerForm = document.getElementById('tracerForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const submissionsBody = document.getElementById('submissionsBody');
    const message = document.getElementById('message');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => auth.logout());
    }

    if (tracerForm) {
        if (!auth.requireAuth()) return;

        const user = auth.getUser();
        document.getElementById('schoolId').value = user.school_id || '';
        document.getElementById('firstName').value = user.first_name || '';
        document.getElementById('middleName').value = user.middle_name || '';
        document.getElementById('lastName').value = user.last_name || '';

        const yearSelect = document.getElementById('graduationYear');
        for (let year = 2022; year >= 2016; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }

        api.getMySubmission()
            .then(data => {
                document.getElementById('course').value = data.course || '';
                document.getElementById('graduationYear').value = data.graduation_year || '';
                document.getElementById('currentWork').value = data.current_work || '';
                
                if (data.status && data.status !== 'pending') {
                    showStatus(`Your submission is ${data.status}`, data.status === 'approved' ? 'success' : 'error');
                    tracerForm.querySelector('button[type="submit"]').disabled = true;
                    
                    if (data.status === 'approved') {
                        document.getElementById('workChangeSection').style.display = 'block';
                    }
                }
            })
            .catch(() => {});

        tracerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const data = {
                course: document.getElementById('course').value,
                graduation_year: document.getElementById('graduationYear').value,
                current_work: document.getElementById('currentWork').value
            };
            
            try {
                await api.submitTracer(data);
                showStatus('Tracer form submitted successfully!', 'success');
                tracerForm.querySelector('button[type="submit"]').disabled = true;
            } catch (error) {
                showStatus(error.message, 'error');
            }
        });

        const requestWorkChangeBtn = document.getElementById('requestWorkChangeBtn');
        if (requestWorkChangeBtn) {
            requestWorkChangeBtn.addEventListener('click', async () => {
                const newWork = document.getElementById('newWork').value;
                if (!newWork.trim()) {
                    alert('Please enter your new work');
                    return;
                }
                
                try {
                    await api.requestWorkChange(newWork);
                    alert('Work change request submitted!');
                    document.getElementById('newWork').value = '';
                } catch (error) {
                    alert(error.message);
                }
            });
        }
    }

    if (submissionsBody) {
        if (!auth.requireAdmin()) return;
        loadSubmissions();
    }

    async function loadSubmissions() {
        try {
            const submissions = await api.getSubmissions();
            renderSubmissions(submissions);
        } catch (error) {
            submissionsBody.innerHTML = `<tr><td colspan="8">Error: ${error.message}</td></tr>`;
        }
    }

    function renderSubmissions(submissions) {
        if (submissions.length === 0) {
            submissionsBody.innerHTML = '<tr><td colspan="8">No submissions found</td></tr>';
            return;
        }

        submissionsBody.innerHTML = submissions.map(sub => `
            <tr>
                <td>${sub.school_id || '-'}</td>
                <td>${sub.last_name}, ${sub.first_name} ${sub.middle_name || ''}</td>
                <td>${sub.course}</td>
                <td>${sub.graduation_year}</td>
                <td>${sub.current_work || '-'}</td>
                <td class="status-${sub.employment_status}">${sub.employment_status}</td>
                <td class="status-${sub.status}">${sub.status}</td>
                <td class="actions">
                    <button class="btn" style="padding:4px 8px;font-size:12px;width:auto;display:inline-block;margin-right:3px;" onclick="editAlumni(${sub.id})">Edit</button>
                    ${sub.status === 'pending' ? `
                        <button class="btn btn-success" style="padding:4px 8px;font-size:12px;width:auto;display:inline-block;margin-right:3px;" onclick="approveSubmission(${sub.id})">Approve</button>
                        <button class="btn btn-danger" style="padding:4px 8px;font-size:12px;width:auto;display:inline-block;margin-right:3px;" onclick="rejectSubmission(${sub.id})">Reject</button>
                    ` : sub.status === 'approved' ? `
                        <button class="btn btn-danger" style="padding:4px 8px;font-size:12px;width:auto;display:inline-block;margin-right:3px;" onclick="rejectSubmission(${sub.id})">Reject</button>
                    ` : `
                        <button class="btn btn-success" style="padding:4px 8px;font-size:12px;width:auto;display:inline-block;margin-right:3px;" onclick="approveSubmission(${sub.id})">Approve</button>
                    `}
                    <button class="btn btn-danger" style="padding:4px 8px;font-size:12px;width:auto;display:inline-block;" onclick="deleteAlumni(${sub.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    function showStatus(text, type) {
        const statusMessage = document.getElementById('statusMessage');
        if (statusMessage) {
            statusMessage.textContent = text;
            statusMessage.className = `alert alert-${type}`;
            statusMessage.style.display = 'block';
        }
    }

    function showMessage(text, type) {
        if (message) {
            message.textContent = text;
            message.className = `alert alert-${type}`;
            message.style.display = 'block';
            setTimeout(() => {
                message.style.display = 'none';
            }, 3000);
        }
    }

    window.approveSubmission = async function(id) {
        try {
            await api.updateSubmissionStatus(id, 'approve');
            showMessage('Submission approved successfully', 'success');
            loadSubmissions();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    };

    window.rejectSubmission = async function(id) {
        try {
            await api.updateSubmissionStatus(id, 'reject');
            showMessage('Submission rejected successfully', 'success');
            loadSubmissions();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    };

    window.editAlumni = async function(id) {
        const submissions = await api.getSubmissions();
        const sub = submissions.find(s => s.id === id);
        if (!sub) return;

        const newFirstName = prompt('First Name:', sub.first_name);
        const newMiddleName = prompt('Middle Name:', sub.middle_name || '');
        const newLastName = prompt('Last Name:', sub.last_name);
        const newCourse = prompt('Course:', sub.course);
        const newYear = prompt('Graduation Year:', sub.graduation_year);
        const newWork = prompt('Current Work:', sub.current_work || '');
        const newEmployment = prompt('Employment Status (employed/unemployed):', sub.employment_status);

        if (newFirstName && newLastName && newCourse && newYear) {
            try {
                await api.updateAlumni(id, {
                    first_name: newFirstName,
                    middle_name: newMiddleName,
                    last_name: newLastName,
                    course: newCourse,
                    graduation_year: newYear,
                    current_work: newWork,
                    employment_status: newEmployment
                });
                showMessage('Alumni updated successfully', 'success');
                loadSubmissions();
            } catch (error) {
                showMessage(error.message, 'error');
            }
        }
    };

    window.deleteAlumni = async function(id) {
        if (confirm('Are you sure you want to delete this alumni?')) {
            try {
                await api.deleteAlumni(id);
                showMessage('Alumni deleted successfully', 'success');
                loadSubmissions();
            } catch (error) {
                showMessage(error.message, 'error');
            }
        }
    };
});
