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
    progressWrap.style.display = "block";
    statusText.textContent = `署名URL取得中…`;

    const res = await fetch(`/generateUploadUrl?name=${encodeURIComponent(file.name)}`);
    const { uploadUrl } = await res.json();

    statusText.textContent = "アップロード中…";

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            progressBar.value = percent;
            statusText.textContent = `${percent}%`;
        }
    };

    xhr.onload = () => {
        if (xhr.status === 200) {
            statusText.textContent = "アップロード完了！";
            progressBar.value = 100;
        } else {
            statusText.textContent = `エラー: ${xhr.status}`;
        }
    };

    xhr.onerror = () => {
        statusText.textContent = "通信エラー";
    };

    xhr.send(file);
}
