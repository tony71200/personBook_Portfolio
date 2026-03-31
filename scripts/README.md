# Scripts Guide: Lấy Gemini API Key & cấu hình vào dự án (cập nhật đến tháng 03/2026)

Tài liệu này hướng dẫn nhanh cho dự án `personBook_Portfolio`:
1. Cách lấy **Gemini API Key**.
2. Cách đặt API Key trên **Windows** và **Linux/macOS**.
3. Cách nối API Key vào đúng luồng của dự án (local script + serverless proxy).

---

## 1) Lấy Gemini API Key (Google AI Studio)

> Theo tài liệu Google AI for Developers (trang “Using Gemini API keys”), tính đến tháng 03/2026 bạn tạo key trong **Google AI Studio** và key gắn với Google Cloud project.

### Các bước

1. Mở: https://ai.google.dev/gemini-api/docs/api-key
2. Đăng nhập Google account.
3. Vào trang API Keys trong AI Studio.
4. Chọn project (hoặc import/create project nếu chưa có).
5. Tạo key mới và copy lại ngay (không commit key vào Git).

### Lưu ý bảo mật quan trọng

- Không hard-code API key trong frontend/public JS.
- Không đẩy key lên GitHub.
- Với web app production: gọi Gemini qua backend/proxy (dự án này dùng `api/chat.js`).

---

## 2) Đặt API Key trên Windows

Biến môi trường dùng trong dự án:
- `GEMINI_API_KEY`
- (tuỳ chọn) `ALLOWED_ORIGIN` cho proxy serverless.

### 2.1 Dùng tạm trong phiên terminal hiện tại

#### CMD
```bat
set GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

#### PowerShell
```powershell
$env:GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

Kiểm tra:

#### CMD
```bat
echo %GEMINI_API_KEY%
```

#### PowerShell
```powershell
echo $env:GEMINI_API_KEY
```

### 2.2 Dùng lâu dài (persist)

#### CMD (User-level)
```bat
setx GEMINI_API_KEY "YOUR_GEMINI_API_KEY"
```

> Đóng/mở lại terminal sau khi chạy `setx`.

#### PowerShell (User-level)
```powershell
[Environment]::SetEnvironmentVariable("GEMINI_API_KEY","YOUR_GEMINI_API_KEY","User")
```

---

## 3) Đặt API Key trên Linux/macOS

### 3.1 Dùng tạm cho session hiện tại

```bash
export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

Kiểm tra:

```bash
echo "$GEMINI_API_KEY"
```

### 3.2 Dùng lâu dài (persist)

Thêm vào shell profile:

#### Bash
```bash
echo 'export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"' >> ~/.bashrc
source ~/.bashrc
```

#### Zsh
```bash
echo 'export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"' >> ~/.zshrc
source ~/.zshrc
```

---

## 4) Cách dùng API Key trong dự án này

## A. Chạy script tạo embedding

File script: `scripts/generate_vectors.js`

Chạy:

```bash
GEMINI_API_KEY="YOUR_GEMINI_API_KEY" node scripts/generate_vectors.js
```

Kết quả:
- Cập nhật `data/database.json`
- Cập nhật `data/database.local.js`


### Ghi chú model embedding (03/2026)

Script `scripts/generate_vectors.js` hiện ưu tiên model `gemini-embedding-001` và tự fallback sang `text-embedding-004` nếu project cũ còn hỗ trợ.

## B. Dùng cho chatbot runtime (an toàn)

- Frontend gọi `/api/chat`.
- Key thật chỉ nằm ở backend serverless `api/chat.js`.

### Nếu deploy Vercel

Trong Vercel Project Settings → Environment Variables, thêm:
- `GEMINI_API_KEY=YOUR_GEMINI_API_KEY`
- `ALLOWED_ORIGIN=https://<your-github-pages-domain>` (khuyến nghị)

Sau đó redeploy.

---

## 5) Checklist nhanh khi lỗi key

1. `GEMINI_API_KEY` có thực sự tồn tại trong environment không?
2. Có nhầm quote/ký tự trắng khi copy key không?
3. Nếu dùng `setx`, đã mở terminal mới chưa?
4. Với Vercel, đã set đúng Environment + redeploy chưa?
5. API key có thuộc đúng project đã bật Gemini API chưa?

---

## Nguồn chính thức

- Gemini API key guide: https://ai.google.dev/gemini-api/docs/api-key
- Gemini API reference (auth + header key): https://ai.google.dev/api
- API key safety notes: https://ai.google.dev/tutorials/setup
