# Prior Testnet Auto Bot

Bot tự động tham gia testnet Prior Protocol trên Base Sepolia

## 🔍 Tính năng

- Tự động swap token PRIOR sang USDC trên testnet Prior Protocol
- Hỗ trợ nhiều ví (multi-wallet) để thao tác hàng loạt
- Hỗ trợ proxy để đổi IP (tùy chọn)
- Tự động báo cáo giao dịch swap lên API của Prior Protocol
- Hẹn giờ tự động lặp lại quy trình mỗi 24h
- Xử lý lỗi và tự động thử lại

## 🛠️ Yêu cầu

- Node.js (v14 trở lên)
- Có sẵn token PRIOR trong ví trên mạng Base Sepolia testnet
- Private key của các ví lưu trong file `keys.txt`

## ⚙️ Cài đặt

1. Clone repository:
```bash
git clone https://github.com/NgChien/Prior-Testnet-Auto-Bot.git
```

2. Di chuyển vào thư mục dự án:
```bash
cd Prior-Testnet-Auto-Bot
```

3. Cài đặt thư viện:
```bash
npm install
```

4. Tạo file `keys.txt` trong thư mục gốc, mỗi dòng là 1 private key ví:
```
private_key_1
private_key_2
# Có thể thêm nhiều ví, mỗi dòng 1 key, dòng bắt đầu bằng # sẽ bị bỏ qua
```

5. (Tùy chọn) Tạo file `proxies.txt` nếu muốn dùng proxy (mỗi dòng 1 proxy):
```
user:pass@ip:port
ip:port
http://user:pass@ip:port
```

## 🚀 Sử dụng

Chạy bot bằng lệnh:
```bash
node index.js
```

Bot sẽ:
1. Đọc tất cả private key từ file `keys.txt`
2. Kiểm tra số dư token PRIOR và USDC
3. Approve token nếu cần thiết
4. Thực hiện swap 0.1 PRIOR ↔ 1 USDC (tối đa 5 lần/ngày/1 ví)
5. Báo cáo giao dịch swap lên API Prior Protocol
6. Có thể claim faucet tự động nếu chọn menu
7. Lặp lại quy trình mỗi 24h nếu chọn chế độ tự động

### Menu chức năng
- 1: Chỉ claim faucet cho tất cả ví
- 2: Chỉ swap 5 lần cho mỗi ví
- 3: Claim faucet rồi swap 5 lần
- 4: Tự động claim faucet + swap 5 lần mỗi 24h
- 0: Thoát

## ⚠️ Lưu ý quan trọng

- Mỗi ví cần có ít nhất 0.1 PRIOR và/hoặc 1 USDC để swap
- Cần có ETH Sepolia để trả phí gas
- Bot sẽ thực hiện tối đa 5 lần swap/ngày/1 ví (theo giới hạn của hệ thống)
- Luôn bảo mật file `keys.txt`, không chia sẻ cho bất kỳ ai

## 🔗 Thông tin mạng lưới

- Mạng: Base Sepolia Testnet
- PRIOR Token: 0xeFC91C5a51E8533282486FA2601dFfe0a0b16EDb
- USDC Token: 0xdB07b0b4E88D9D5A79A08E91fEE20Bb41f9989a2
- Swap Router: 0x8957e1988905311EE249e679a29fc9deCEd4D910
- Faucet Contract: 0xa206dC56F1A56a03aEa0fCBB7c7A62b5bE1Fe419

## 📋 Tuỳ chỉnh

Bạn có thể chỉnh các tham số sau trong code:
- Số lần swap tối đa mỗi ví: MAX_SWAPS_PER_WALLET (mặc định 5)
- Số lượng PRIOR/USDC mỗi lần swap: 0.1 PRIOR hoặc 1 USDC
- Thời gian chờ giữa các lần swap, claim: có thể chỉnh trong hàm sleep()

## 📝 Giấy phép

MIT

## ⚠️ Cảnh báo

Bot này chỉ dùng cho mục đích học tập, thử nghiệm. Sử dụng bot đồng nghĩa bạn tự chịu trách nhiệm với tài sản của mình. Tác giả không chịu trách nhiệm với bất kỳ tổn thất nào khi sử dụng bot này.