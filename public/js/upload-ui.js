const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");
const statusText = document.getElementById("status");

dropZone.onclick = () => fileInput.click();

dropZone.ondragover = (e) => {
    e.preventDefault();
    dropZone.style.opacity = "0.6";
};

dropZone.ondragleave = () => {
    dropZone.style.opacity = "1.0";
};

dropZone.ondrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    upload(file);
};

fileInput.onchange = () => {
    upload(fileInput.files[0]);
};

async function upload(file) {
    console.log("[DEBUG] Upload started for:", file.name);

    // UI Reset
    progressWrap.style.display = "block";
    statusText.className = 'status-processing';
    statusText.textContent = `⏳ 署名URL取得中…`;

    try {
        // 1. Get Presigned URL
        console.log("[DEBUG] Fetching upload URL...");
        const res = await fetch(`/generateUploadUrl?name=${encodeURIComponent(file.name)}`);

        if (!res.ok) {
            const errText = await res.text();
            console.error("[DEBUG] Failed to get upload URL:", res.status, errText);
            throw new Error(`署名URL取得エラー: ${res.status} - ${errText}`);
        }

        const { uploadUrl } = await res.json();
        console.log("[DEBUG] Got upload URL:", uploadUrl);

        // 2. Perform PUT Upload
        statusText.textContent = "🚀 アップロード中…";

        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressBar.value = percent;
                statusText.textContent = `🚀 アップロード中… ${percent}%`;
            }
        };

        xhr.onload = () => {
            console.log("[DEBUG] XHR State:", xhr.readyState, "Status:", xhr.status);
            if (xhr.status === 200 || xhr.status === 201) {
                console.log("[DEBUG] Upload success!");
                statusText.className = 'status-success';
                statusText.innerHTML = "✅ アップロード完了！<br>続けてファイルをドロップできます。";
                progressBar.value = 100;
            } else {
                console.error("[DEBUG] Upload failed. Response:", xhr.responseText);
                statusText.className = 'status-error';
                statusText.innerHTML = `❌ アップロード失敗: ${xhr.status}<br><small>${xhr.responseText.substring(0, 100)}...</small>`;
            }
        };

        xhr.onerror = () => {
            console.error("[DEBUG] Network Error during XHR");
            statusText.className = 'status-error';
            statusText.textContent = "❌ 通信エラー (CORS設定等を確認してください)";
        };

        xhr.send(file);

    } catch (error) {
        console.error("[DEBUG] Exception caught:", error);
        statusText.className = 'status-error';
        statusText.textContent = `❌ エラー: ${error.message}`;
    }
}
