
# Kế hoạch tái cấu trúc app học tiếng Nhật

## Phase 1: Tái cấu trúc API & Types (nền tảng)

### 1.1 Chia API thành thư mục riêng
Mỗi module có folder riêng với `index.ts`, `types.ts`, `mock-data.ts`:
- `src/lib/api/transcription/` — Transcript, YouTube, channels
- `src/lib/api/flashcard/` — Vocab topics, collections, review
- `src/lib/api/grammar/` — Grammar topics, collections, review  
- `src/lib/api/manga/` — Manga, chapters, OCR
- `src/lib/api/practice/` — Sentence practice (4 loại)
- `src/lib/api/auth/` — Auth, user settings, Google login
- `src/lib/api/settings/` — Settings save/load, custom server
- `src/lib/api/common/` — Credits, keep-alive, history

### 1.2 Định nghĩa tất cả models rõ ràng (không optional)
- Request/Response types cho mọi API endpoint
- Tất cả fields required, dùng `null` thay vì `undefined`

---

## Phase 2: Transcript & Video Player

### 2.1 Split-screen video player
- Bên trái: Video player (play/pause, tua, tốc độ, thời lượng tua tuỳ chỉnh)
- Bên phải: Synced transcript + side panel (collapse được)

### 2.2 Cloze 3 chế độ
- **Classic (random)**: Ẩn ngẫu nhiên, tuỳ chỉnh số từ min/max trong cloze, khoảng cách min/max giữa cloze
- **Listening**: Che từ đang đọc và xung quanh (luyện nghe)
- **Reading**: Chỉ hiện từ đang đọc + vài từ quanh (luyện đọc), slider độ rộng + drag offset

### 2.3 Transcript features
- Transcript toàn bộ hoặc một phần video
- Filter video đã/chưa transcript
- Tab lịch sử phiên dịch (thay vì trang riêng)
- Tab transcript công khai (gộp vào phần phiên dịch)
- Tra từ + lưu vào flashcard
- Review flashcard từ trong bài

### 2.4 YouTube browsing
- Lướt channel, "đăng ký channel" để quick access
- Hiện video đã transcript vs chưa

---

## Phase 3: Manga Reader

### 3.1 Reader improvements
- Fit trang theo chiều dọc
- Điều khiển bàn phím/chuột kéo trang
- OCR overlay đè lên trang (không phải ở dưới)

### 3.2 Side panel phải
- Tra cứu từ
- Chatbot
- OCR → hiện flashcard đã lưu + cho thêm từ mới
- OCR tốn credit

---

## Phase 4: Flashcard (Từ vựng)

### 4.1 Topic & Collection system (thay Deck)
- Tạo chủ đề (topic) thay vì deck
- Collection of topics (mặc định: theo từ loại)
- Tick chọn topics để review (chọn hết / từng cái)
- Counter số từ cần review

### 4.2 Review improvements
- Phím tắt thao tác nhanh
- Quay lại max 20 từ đã học (phòng nhầm)
- Thêm từ: chỉ nhập mặt trước (JP), mặt sau tự tạo

### 4.3 Settings cho flashcard
- Tuỳ chỉnh fields mặt trước/sau
- Tỉ lệ xuất hiện từ theo topic
- Số từ mới mỗi topic
- Preset điều chỉnh

---

## Phase 5: Grammar

### 5.1 Tương tự flashcard
- Topic & Collection system
- 2 lựa chọn ôn: flashcard thường + dịch VN→JP
- Custom deck/topic
- Thêm ngữ pháp: list phân trang, tick chọn, tìm kiếm, hiện đã thêm

---

## Phase 6: Practice (Luyện dịch)

### 6.1 4 loại luyện tập
1. Điền từ vào cloze
2. Điền câu đúng nghĩa (chọn câu đúng)
3. Dịch JP → VN
4. Dịch VN → JP

### 6.2 Tuỳ chỉnh
- Chọn thứ tự các loại
- Chọn làm loại nào
- 2 chế độ: VN→JP và JP→VN

---

## Phase 7: Auth & Settings

### 7.1 Auth
- Đăng ký tài khoản thường
- Đăng nhập Google
- Thay đổi thông tin, password, link Google

### 7.2 Settings
- Custom server (transcript server, AI API key)
- Keep-alive polling 10 phút (bật/tắt)
- Lưu/load file cài đặt
- Side panel cài đặt ở mỗi trang
- Cài đặt mỗi module (transcript, manga, flashcard, grammar, practice)

### 7.3 Lịch sử
- Tab lịch sử ở từng trang (không trang riêng)
- Bỏ trang transcript công khai riêng (gộp vào phiên dịch)

---

## Ước tính: ~50+ files mới/sửa. Đề xuất chia thành 3-4 lần implement.
