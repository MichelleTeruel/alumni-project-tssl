document.addEventListener('DOMContentLoaded', () => {
    if (!auth.requireAdmin()) return;

    document.getElementById('logoutBtn').addEventListener('click', () => auth.logout());

    loadDashboard();

    async function loadDashboard() {
        try {
            const [analytics, workRequests] = await Promise.all([
                api.getAnalytics(),
                api.getWorkChangeRequests()
            ]);

            document.getElementById('totalGraduates').textContent = analytics.total_graduates;
            document.getElementById('employed').textContent = analytics.employed;
            document.getElementById('unemployed').textContent = analytics.unemployed;
            document.getElementById('pendingApprovals').textContent = analytics.pending_approvals;

            renderWorkRequests(workRequests.filter(r => r.status === 'pending'));
        } catch (error) {
            console.error(error);
        }
    }

    function renderWorkRequests(requests) {
        const tbody = document.getElementById('workRequestsBody');
        if (requests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No pending work change requests</td></tr>';
            return;
        }

        tbody.innerHTML = requests.map(req => `
            <tr>
                <td>${req.first_name} ${req.last_name}</td>
                <td>${req.current_work_old || '-'}</td>
                <td>${req.new_work}</td>
                <td class="status-${req.status}">${req.status}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="approveWorkChange(${req.id})">Approve</button>
                    <button class="btn btn-sm btn-danger" onclick="rejectWorkChange(${req.id})">Reject</button>
                </td>
            </tr>
        `).join('');
    }

    window.approveWorkChange = async function(id) {
        try {
            await api.updateWorkChangeRequest(id, 'approve');
            showMessage('Work change approved', 'success');
            loadDashboard();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    };

    window.rejectWorkChange = async function(id) {
        try {
            await api.updateWorkChangeRequest(id, 'reject');
            showMessage('Work change rejected', 'success');
            loadDashboard();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    };

    function showMessage(text, type) {
        const msg = document.getElementById('message');
        msg.textContent = text;
        msg.className = `alert alert-${type}`;
        msg.style.display = 'block';
        setTimeout(() => msg.style.display = 'none', 3000);
    }
});
