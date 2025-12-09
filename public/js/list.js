document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refreshList');
    const filesContainer = document.getElementById('files');

    async function fetchFiles() {
        filesContainer.innerHTML = '読み込み中...';
        try {
            const res = await fetch('/listFiles');
            if (!res.ok) throw new Error('Failed to list files');
            const objects = await res.json();

            renderFiles(objects);
        } catch (err) {
            filesContainer.textContent = 'エラーが発生しました: ' + err.message;
        }
    }

    function renderFiles(objects) {
        if (!objects || objects.length === 0) {
            filesContainer.innerHTML = '<p>ファイルが見つかりません</p>';
            return;
        }

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '20px';

        const thead = document.createElement('thead');
        thead.innerHTML = `
      <tr style="border-bottom: 2px solid #555;">
        <th style="padding: 10px; text-align: left;">ファイル名</th>
        <th style="padding: 10px; text-align: left;">サイズ</th>
        <th style="padding: 10px; text-align: left;">更新日</th>
        <th style="padding: 10px; text-align: center;">操作</th>
      </tr>
    `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        objects.forEach(obj => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #333';

            const sizeStr = formatBytes(obj.size);
            const dateStr = new Date(obj.uploaded).toLocaleString();

            tr.innerHTML = `
        <td style="padding: 10px;">${obj.key}</td>
        <td style="padding: 10px;">${sizeStr}</td>
        <td style="padding: 10px;">${dateStr}</td>
        <td style="padding: 10px; text-align: center;">
          <button class="delete-btn" data-key="${obj.key}" style="background:#d9534f; color:#fff; border:none; padding:5px 10px; cursor:pointer; border-radius:4px;">削除</button>
        </td>
      `;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        filesContainer.innerHTML = '';
        filesContainer.appendChild(table);

        // Attach delete events
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const key = e.target.dataset.key;
                if (confirm(`本当に「${key}」を削除しますか？`)) {
                    await deleteFile(key);
                }
            });
        });
    }

    async function deleteFile(key) {
        try {
            const res = await fetch(`/deleteFile?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
            if (res.ok) {
                alert('削除しました');
                fetchFiles();
            } else {
                alert('削除に失敗しました');
            }
        } catch (err) {
            alert('エラー: ' + err.message);
        }
    }

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    // Initial load
    fetchFiles();

    // Refresh event
    refreshBtn.addEventListener('click', (e) => {
        e.preventDefault();
        fetchFiles();
    });
});
