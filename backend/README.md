# Backend

This directory contains the Django backend for the project.

## Setup

1.  **Create and activate a virtual environment:**

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

2.  **Install the dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the database migrations:**

    ```bash
    python manage.py migrate
    ```

4.  **Start the development server:**

    ```bash
    python manage.py runserver
    ```

The backend will be running at `http://127.0.0.1:8000`.

## API Endpoints

*   **Register:** `POST /api/register/`
*   **Login:** `POST /api/login/`
*   **Refresh Token:** `POST /api/login/refresh/`
