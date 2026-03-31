# personBook_Portfolio

## AI Chatbot Maintenance

Trang 9 đã tích hợp chatbot RAG tại `.chatbot-box` với mô hình Gemini 1.5 Flash thông qua Vercel Serverless Proxy (`api/chat.js`).

### Biến môi trường cần có trên Vercel

- `GEMINI_API_KEY`: API key cho Gemini.
- `ALLOWED_ORIGIN` (khuyến nghị): domain GitHub Pages được phép gọi API proxy.

### Luồng cập nhật dữ liệu RAG

1. Cập nhật nội dung vào `data/raw_data.json`.
2. Chạy script tạo embedding:

   ```bash
   GEMINI_API_KEY=your_key node scripts/generate_vectors.js
   ```

3. Script sẽ ghi kết quả vào `data/database.json`.
4. Commit + push để deploy.

### Ghi chú quota

- Frontend theo dõi giới hạn 15 RPM bằng `localStorage` key `gemini_quota`.
- Lịch sử chat trong phiên được lưu bằng `sessionStorage` key `chat_session_history`.
