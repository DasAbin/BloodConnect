# Blood Donation Management System (BloodConnect)

A full-stack DBMS project designed to manage blood donations, donor availability, and emergency blood requests. This application demonstrates database design principles, including relational mapping, complex queries, and data integrity.

## 📊 Database Architecture

The core of this project is a relational database implemented using **SQLite** and **SQLAlchemy (ORM)**.

### Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    DONORS ||--o{ DONATION_HISTORY : "donates"
    BLOOD_REQUESTS ||--o{ DONATION_HISTORY : "fulfills"
    BLOOD_GROUPS ||--|| BLOOD_INVENTORY : "tracks"

    DONORS {
        int donor_id PK
        string name
        int age
        string gender
        string blood_group
        string phone
        string city
        date last_donation_date
        boolean is_available
        datetime registered_at
    }

    BLOOD_REQUESTS {
        int request_id PK
        string requester_name
        string blood_group
        int units_needed
        string city
        string contact
        string urgency
        string status
        datetime created_at
    }

    DONATION_HISTORY {
        int history_id PK
        int donor_id FK
        int request_id FK
        datetime donated_on
        int units_donated
    }

    BLOOD_INVENTORY {
        int inventory_id PK
        string blood_group UK
        int units_available
        datetime last_updated
    }

    ADMINS {
        int admin_id PK
        string username UK
        string password_hash
    }

    USERS {
        int user_id PK
        string name
        string email UK
        string password_hash
        datetime created_at
    }
```

### Table Definitions & Constraints

1.  **Donors**: Stores donor profiles. Uses a boolean flag `is_available` to filter eligible donors.
2.  **Blood Requests**: Tracks patient needs. Includes `urgency` levels (Critical, High, Normal) and `status` (Pending, Fulfilled).
3.  **Donation History**: A junction-style table that logs every donation event, linking a `Donor` to a specific `BloodRequest` (if applicable).
4.  **Blood Inventory**: Maintains real-time stock levels for each blood group.
5.  **Admins**: Stores hashed credentials for the management portal.
6.  **Users (Patients/Seekers)**: Stores credentials for individuals seeking blood. This enables privacy controls.

## 🔒 Privacy Protection

To protect donor privacy, contact information (phone numbers) is **masked** for public viewers (e.g., `1234******`). Full contact details are only visible to:
*   **Admins**: After logging into the Admin Portal.
*   **Registered Users**: After logging into their Patient/Seeker account.

This ensures that sensitive donor data is only accessible to authenticated individuals who have registered with the platform.

---

## 🔍 Key SQL Implementations

This project goes beyond simple CRUD by utilizing complex SQL queries for dashboard analytics.

### Analytics Aggregation
The dashboard statistics are fetched using a single optimized SQL query involving subqueries and joins to provide a snapshot of the entire system state:

```sql
SELECT 
    (SELECT COUNT(*) FROM donors) as total_donors,
    (SELECT COUNT(*) FROM blood_requests WHERE status = 'pending') as pending_requests,
    (SELECT COUNT(*) FROM blood_requests WHERE status = 'fulfilled') as fulfilled_requests,
    COUNT(d.donor_id) as active_donors_count 
FROM donors d
LEFT JOIN donation_history dh ON d.donor_id = dh.donor_id
WHERE d.is_available = 1;
```

---

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Lucide React (Icons).
- **Backend**: Flask (Python), SQLAlchemy (ORM).
- **Database**: SQLite.
- **State Management**: React Hooks & Context-like architecture.

---

## 🚀 Setup & Execution

### 1. Prerequisites
- Python 3.8+
- Node.js 18+

### 2. Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
*The database (`dbms_mini.db`) will be automatically created and seeded with sample data on the first run.*

### 3. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔐 Admin Credentials
Access the admin portal at `/admin/login`.
- **Username**: `admin`
- **Password**: `admin123`
