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
            submissionsData = submissions;
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
            <tr data-id="${sub.id}">
                <td class="school-id">${sub.school_id || '-'}</td>
                <td class="name-cell">
                    <span class="display-value">${sub.last_name}, ${sub.first_name} ${sub.middle_name || ''}</span>
                </td>
                <td class="course-cell">
                    <span class="display-value">${sub.course}</span>
                </td>
                <td class="year-cell">
                    <span class="display-value">${sub.graduation_year}</span>
                </td>
                <td class="work-cell">
                    <span class="display-value">${sub.current_work || '-'}</span>
                </td>
                <td class="employment-cell">
                    <span class="display-value status-${sub.employment_status}">${sub.employment_status}</span>
                </td>
                <td class="status-cell">
                    <span class="display-value status-${sub.status}">${sub.status}</span>
                </td>
                <td class="actions">
                    <button class="btn edit-btn" style="padding:4px 8px;font-size:12px;width:auto;display:inline-block;margin-right:3px;" onclick="startEdit(${sub.id})">Edit</button>
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

    let currentEditingId = null;
    let submissionsData = [];

    window.startEdit = function(id) {
        if (currentEditingId !== null) {
            cancelEdit();
        }
        
        const row = document.querySelector(`tr[data-id="${id}"]`);
        const sub = submissionsData.find(s => s.id === id);
        if (!sub || !row) return;
        
        currentEditingId = id;
        
        const nameCell = row.querySelector('.name-cell');
        nameCell.innerHTML = `
            <input type="text" class="edit-input" id="edit-firstName" value="${sub.first_name || ''}" placeholder="First Name" style="margin-bottom:4px;">
            <input type="text" class="edit-input" id="edit-middleName" value="${sub.middle_name || ''}" placeholder="Middle Name" style="margin-bottom:4px;">
            <input type="text" class="edit-input" id="edit-lastName" value="${sub.last_name || ''}" placeholder="Last Name">
        `;
        
        const courseCell = row.querySelector('.course-cell');
        courseCell.innerHTML = `
            <select class="edit-select" id="edit-course">
                <option value="BS Information Technology" ${sub.course === 'BS Information Technology' ? 'selected' : ''}>BS Information Technology</option>
                <option value="BS Information System" ${sub.course === 'BS Information System' ? 'selected' : ''}>BS Information System</option>
            </select>
        `;
        
        const yearCell = row.querySelector('.year-cell');
        yearCell.innerHTML = `<input type="number" class="edit-input" id="edit-year" value="${sub.graduation_year || ''}" min="2000" max="2030">`;
        
        const workCell = row.querySelector('.work-cell');
        workCell.innerHTML = `<input type="text" class="edit-input" id="edit-work" value="${sub.current_work || ''}" placeholder="Current Work">`;
        
        const employmentCell = row.querySelector('.employment-cell');
        employmentCell.innerHTML = `
            <select class="edit-select" id="edit-employment">
                <option value="employed" ${sub.employment_status === 'employed' ? 'selected' : ''}>employed</option>
                <option value="unemployed" ${sub.employment_status === 'unemployed' ? 'selected' : ''}>unemployed</option>
            </select>
        `;
        
        const actionsCell = row.querySelector('.actions');
        actionsCell.innerHTML = `
            <button class="btn btn-success" style="padding:4px 8px;font-size:12px;width:auto;display:inline-block;margin-right:3px;" onclick="saveEdit(${sub.id})">Done</button>
            <button class="btn btn-secondary" style="padding:4px 8px;font-size:12px;width:auto;display:inline-block;margin-right:3px;" onclick="cancelEdit()">Cancel</button>
        `;
    };

    window.saveEdit = async function(id) {
        const row = document.querySelector(`tr[data-id="${id}"]`);
        
        const newFirstName = document.getElementById('edit-firstName').value;
        const newMiddleName = document.getElementById('edit-middleName').value;
        const newLastName = document.getElementById('edit-lastName').value;
        const newCourse = document.getElementById('edit-course').value;
        const newYear = document.getElementById('edit-year').value;
        const newWork = document.getElementById('edit-work').value;
        const newEmployment = document.getElementById('edit-employment').value;
        
        if (!newFirstName || !newLastName || !newCourse || !newYear) {
            showMessage('Please fill in required fields', 'error');
            return;
        }
        
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
            currentEditingId = null;
            loadSubmissions();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    };

    window.cancelEdit = function() {
        if (currentEditingId !== null) {
            currentEditingId = null;
            loadSubmissions();
        }
    };

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
