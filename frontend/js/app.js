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

        api.getMySubmission()
            .then(data => {
                document.getElementById('firstName').value = data.first_name || '';
                document.getElementById('lastName').value = data.last_name || '';
                document.getElementById('course').value = data.course || '';
                document.getElementById('graduationYear').value = data.graduation_year || '';
                document.getElementById('currentWork').value = data.current_work || '';
                
                if (data.status && data.status !== 'pending') {
                    showStatus(`Your submission is ${data.status}`, data.status === 'approved' ? 'success' : 'error');
                    tracerForm.querySelector('button[type="submit"]').disabled = true;
                }
            })
            .catch(() => {});

        tracerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const data = {
                first_name: document.getElementById('firstName').value,
                last_name: document.getElementById('lastName').value,
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
            submissionsBody.innerHTML = `<tr><td colspan="7">Error: ${error.message}</td></tr>`;
        }
    }

    function renderSubmissions(submissions) {
        if (submissions.length === 0) {
            submissionsBody.innerHTML = '<tr><td colspan="7">No submissions found</td></tr>';
            return;
        }

        submissionsBody.innerHTML = submissions.map(sub => `
            <tr>
                <td>${sub.first_name} ${sub.last_name}</td>
                <td>${sub.course}</td>
                <td>${sub.graduation_year}</td>
                <td>${sub.current_work || '-'}</td>
                <td>${sub.email}</td>
                <td class="status-${sub.status}">${sub.status}</td>
                <td class="actions">
                    ${sub.status === 'pending' ? `
                        <button class="btn btn-success" onclick="approveSubmission(${sub.id})">Approve</button>
                        <button class="btn btn-danger" onclick="rejectSubmission(${sub.id})">Reject</button>
                    ` : sub.status === 'approved' ? `
                        <button class="btn btn-danger" onclick="rejectSubmission(${sub.id})">Reject</button>
                    ` : `
                        <button class="btn btn-success" onclick="approveSubmission(${sub.id})">Approve</button>
                    `}
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
});
