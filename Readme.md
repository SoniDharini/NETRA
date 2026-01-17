# 👁️ Netra

**Netra** is a full-stack web application that enables users to upload datasets, preview data, and perform preprocessing and further analysis. The project is built with a modern **React + TypeScript frontend** and a **Django backend**, ensuring scalability, security, and smooth data handling.

---

## 🚀 Tech Stack

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS (if applicable)
- Axios / Fetch API

### Backend
- Django
- Django REST Framework
- SQLite / PostgreSQL (configurable)

---

## 📁 Project Structure

netra/
├── frontend/ # React + TypeScript frontend
├── backend/ # Django backend
└── README.md


---

## ⚙️ Prerequisites

Make sure the following are installed on your system:

- **Node.js** (v18+ recommended)
- **npm** (comes with Node.js)
- **Python** (v3.9+ recommended)
- **pip**
- **virtualenv** (optional but recommended)

---

## 🖥️ Frontend Setup (React)

### Step 1: Navigate to frontend folder
```bash
cd frontend
Step 2: Install dependencies
npm install
Step 3: Run the development server
npm run dev
The frontend will start at:

http://localhost:5173
🔧 Backend Setup (Django)
Step 1: Navigate to backend folder
cd backend
Step 2: Create and activate virtual environment (recommended)
Windows

python -m venv venv
venv\Scripts\activate
Mac / Linux

python3 -m venv venv
source venv/bin/activate
Step 3: Install backend dependencies
pip install -r requirements.txt
Step 4: Apply database migrations
python manage.py makemigrations
python manage.py migrate
Step 5: Run the Django development server
python manage.py runserver
The backend API will start at:

http://localhost:8000
🔐 Authentication
User authentication is handled via the existing Django authentication system.

Uploaded datasets are securely stored and associated with the logged-in user.

No additional admin setup is required for basic usage.

📊 Key Features
Secure user authentication

Dataset upload and backend storage

Fast parsing and data preview (first 5 rows × 5 columns)

Preprocessing pipeline for data cleaning and feature engineering

Scalable full-stack architecture

🤝 Contribution
Contributions are welcome!
Feel free to fork the repository, raise issues, and submit pull requests