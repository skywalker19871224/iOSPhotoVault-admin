import { UploadAPI } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const dropArea = document.getElementById('dropArea');
    const statusBox = document.getElementById('statusBox');
    const fileLabel = document.getElementById('fileLabel');

    let selectedFile = null;

    // --- Drag & Drop Interfaces ---
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('drag-over');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('drag-over');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('drag-over');

        if (e.dataTransfer.files.length) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });

    // --- Click Interfaces ---
    dropArea.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileSelection(e.target.files[0]);
        }
    });

    // --- Core Logic ---
    function handleFileSelection(file) {
        selectedFile = file;
        fileLabel.textContent = `選択中: ${file.name} (${formatBytes(file.size)})`;
        uploadBtn.disabled = false;
        statusBox.style.display = 'none';
    }

    uploadBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        setLoading(true);

        try {
            // Use the API abstraction
            const result = await UploadAPI.uploadFile(selectedFile);
            showStatus(`アップロード成功: ${result.filename}`, 'success');
        } catch (error) {
            console.error(error);
            showStatus('アップロードに失敗しました', 'error');
        } finally {
            setLoading(false);
        }
    });

    // --- Helpers ---
    function setLoading(isLoading) {
        uploadBtn.disabled = isLoading;
        uploadBtn.textContent = isLoading ? 'アップロード中...' : 'アップロード開始';
        if (isLoading) {
            dropArea.style.pointerEvents = 'none';
            dropArea.style.opacity = '0.6';
        } else {
            dropArea.style.pointerEvents = 'auto';
            dropArea.style.opacity = '1';
        }
    }

    function showStatus(msg, type) {
        statusBox.textContent = msg;
        statusBox.className = `status-box ${type}`;
    }

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }
});
