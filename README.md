# Financy | Modern Personal Finance Dashboard

**Financy** is a high-performance, responsive finance tracking web application designed to help users manage their capital with ease. Built with a focus on modern UI/UX principles, it provides real-time data visualization and secure cloud-based transaction management.

## 🚀 Key Features

* **Secure Authentication**: Integrated with **Firebase Auth** for Email/Password and **Google OAuth** login.
* **Real-time Transactions**: Leverages **Firebase Firestore** for instant data synchronization across devices.
* **Dynamic Analytics**: Visualizes spending habits using **Chart.js** with doughnut charts for category breakdown and line charts for daily spending trends.
* **Interactive UI**: Features a "Glassmorphism" design, smooth CSS animations, and a responsive sidebar for mobile-friendly navigation.
* **Data Portability**: Users can export their transaction history to **CSV** format for external records.

## 🛠️ Tech Stack

* **Frontend**: HTML5, Tailwind CSS
* **JavaScript**: ES6+ (Modules)
* **Backend/Database**: Firebase Firestore
* **Authentication**: Firebase Auth
* **Visualization**: Chart.js

## 📸 Project Structure

* `index.html`: Core structure using a Single Page Application (SPA) architecture with dynamic page views.
* `app.js`: Contains all business logic, including Firestore CRUD operations, state management, and chart initialization.
* `style.css`: Custom CSS for glassmorphism effects, sidebar logic, and iOS Safari optimizations.

## 💡 Technical Highlights (For Interviewers)

* **Real-time Synchronization**: Implemented `onSnapshot` listeners to ensure the UI updates automatically as soon as data changes in the database.
* **Responsive Architecture**: Utilizes dynamic viewport heights (`100dvh`) and `safe-area-inset` to ensure a native-app feel on mobile devices.
* **Data Security**: Includes input sanitization to prevent XSS and organized state management for consistent UI rendering.

## 🔧 Setup

1. Clone the repository.
2. Replace the `firebaseConfig` in `app.js` with your own Firebase project credentials.
3. Open `index.html` in a live server to run the application.

---
**Developed by Sarthak Mohite** *Computer Engineering Student at DY Patil Institute of Technology*
