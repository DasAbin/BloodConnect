# Blood Donation Management System

A full-stack web application built with React, Vite, Tailwind CSS, Flask, and SQLite.

## Project Structure
- `frontend/` - React application
- `backend/` - Flask API and database

## Setup and Running

### 1. Backend
The database will be automatically created and seeded with an admin user, blood groups, and dummy donors on the first run.

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
python app.py
```
The backend API will run on `http://127.0.0.1:5000`

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173`

## Admin Panel
- **URL**: `http://localhost:5173/admin/login`
- **Username**: `admin`
- **Password**: `admin123`
