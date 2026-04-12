# 📡 Smart WiFi-Based Attendance System

This project is a smart attendance system that detects students' presence using WiFi RSSI and MAC address, verifies temporary codes, and records attendance in Firebase Firestore with real-time tracking.

---

## 🔧 Technologies Used

- **Node.js** with **Express.js**
- **Firebase Firestore** (Database)
- **Firebase Authentication**
- **Firebase Admin SDK**
- **HTML/CSS** (Frontend)
- **JavaScript (Frontend + Backend)**

---


---

## 🧠 Key Features

- 🛂 **MAC + RSSI verification** for device-based partial attendance
- 🔐 **Email + Temporary Code Verification** for full attendance
- 📊 **Firestore Attendance Storage**:
  - Document name: student's **email**
  - Field: `"history"` – Array of daily records
- 📆 Tracks **day-wise attendance**
- 🔄 Real-time updates on the dashboard (via Firestore)

---

## Link To the APP
https://wifiattendance-393e7.web.app/
