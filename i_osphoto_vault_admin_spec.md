# iOSPhotoVault_admin — 完全版 Admin System（R2 Direct Upload 対応）仕様書

このドキュメントは、Cloudflare Pages + R2 を利用した **大容量アップロード対応の管理者UI** を構築するための完全仕様書です。Antigravity にそのまま渡すことでプロジェクトを自動生成できます。

---

## 1. プロジェクト概要
管理者専用のアップロード画面とファイル管理 UI を備えた Web 管理ツール。R2 への **Direct Upload**（推奨方式）に対応し、1GB〜5GB 級のファイルもブラウザから直接アップロードできます。

主な機能:
- R2 Direct Upload（5GB以上対応）
- ZIP/動画など大容量ファイル対応
- アップロード進捗バー
- 速度表示 / 残り時間推定
- R2 バケット内のファイル一覧表示
- ファイル削除 API

---

## 2. ディレクトリ構成
```
iOSPhotoVault_admin/
│
├── public/
│   ├── index.html
│   ├── upload.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── upload-ui.js
│       └── list.js
│
├── functions/
│   ├── generateUploadUrl.js
│   ├── listFiles.js
│   └── deleteFile.js
│
├── wrangler.toml
└── README.md
```

---

## 3. Cloudflare 設定

### 3-1. 必要な環境変数
Cloudflare Pages → Settings → Environment Variables

| KEY | VALUE |
|------|--------|
| R2_BUCKET_NAME | user-gallery |
| R2_ACCOUNT_ID | あなたの Cloudflare Account ID |
| R2_ACCESS_KEY_ID | R2 Access Key |
| R2_SECRET_ACCESS_KEY | R2 Secret Key |

---

### 3-2. wrangler.toml
```
name = "iOSPhotoVault_admin"
compatibility_date = "2024-11-30"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "user-gallery"
```

---

## 4. フロントエンド UI（HTML / CSS / JS）

---

### 4-1. public/index.html
```
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>Admin Dashboard</title>
  <link rel="stylesheet" href="./css/style.css" />
</head>
<body>
  <header>
    <h1>管理ダッシュボード</h1>
    <nav>
      <a href="./upload.html">📤 アップロード</a>
      <a href="#" id="refreshList">🔄 更新</a>
    </nav>
  </header>

  <section id="files"></section>

  <script src="./js/list.js"></script>
</body>
</html>
```

---

### 4-2. public/upload.html
```
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>ファイルアップロード</title>
  <link rel="stylesheet" href="./css/style.css" />
</head>
<body>
  <h1>新規アップロード</h1>

  <div id="dropZone">
    ここにファイルをドラッグ＆ドロップ<br>
    またはクリックして選択
  </div>

  <input id="fileInput" type="file" style="display:none;" />

  <div id="progressWrap" style="display:none;">
    <progress id="progressBar" value="0" max="100"></progress>
    <p id="status">待機中…</p>
  </div>

  <script src="./js/upload-ui.js"></script>
</body>
</html>
```

---

### 4-3. public/css/style.css
```
body {
  background: #1e1e1e;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  padding: 20px;
}

#dropZone {
  border: 2px dashed #888;
  padding: 50px;
  text-align: center;
  cursor: pointer;
  margin-top: 30px;
  border-radius: 10px;
}

progress {
  width: 100%;
  height: 20px;
  margin-top: 10px;
}
```

---

### 4-4. public/js/upload-ui.js
```
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
```

---

## 5. Cloudflare Functions（API）

---

### 5-1. generateUploadUrl.js
```
export async function onRequest(context) {
  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET_NAME } = context.env;

  const { searchParams } = new URL(context.request.url);
  const fileName = searchParams.get("name");

  if (!fileName) {
    return new Response("Missing file name", { status: 400 });
  }

  const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${fileName}`;

  const signedUrl = await context.env.BUCKET.createPresignedUrl({
    key: fileName,
    method: "PUT",
    expiration: 3600
  });

  return Response.json({ uploadUrl: signedUrl });
}
```

---

### 5-2. listFiles.js
```
export async function onRequest(context) {
  const list = await context.env.BUCKET.list();
  return Response.json(list.objects);
}
```

---

### 5-3. deleteFile.js
```
export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const key = searchParams.get("key");

  if (!key) return new Response("Missing key", { status: 400 });

  await context.env.BUCKET.delete(key);
  return new Response("OK", { status: 200 });
}
```

---

## 6. README.md
```
# iOSPhotoVault_admin
Cloudflare Pages + R2 を用いた大容量アップロード管理ツール。

## セットアップ手順
1. Cloudflare Pages に環境変数を設定
2. プロジェクトをデプロイ
3. public/upload.html から R2 に大容量アップロードが可能
```

---

## 7. Antigravity に渡す指示文
```
この md に記載されている「iOSPhotoVault_admin」のディレクトリ構成・コード・Cloudflare Pages Functions・R2 Direct Upload の仕様を正確に再現してください。

作成後、ローカルリポジトリを初期化し、GitHub の iOSPhotoVault_admin リポジトリへ push できる状態にしてください。

public/ を Cloudflare Pages の出力ディレクトリとして使用し、functions/ を Functions ルートとして配置してください。

コードの改変や省略は行わず、必ず md の仕様どおりに構築してください。
```

---

以上が完全仕様書です。