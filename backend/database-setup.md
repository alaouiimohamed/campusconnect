CampusConnect - Backend Setup Guide
This guide explains how to set up the local development environment for the CampusConnect backend, including the database setup with Docker (AI-ready) and Django migrations.

Prerequisites
Docker & Docker Compose

Python 3.x

Virtual environment (recommended)

Step 1: Environment Variables Setup
Create a .env file in the root of the backend directory (next to manage.py) and copy the contents from .env.example.

Crucial Note: We are using 127.0.0.1 and port 5433 to prevent conflicts with any local PostgreSQL instances running on Windows.

SECRET_KEY=django-insecure-your-secret-key-here
POSTGRES_DB=SynapseFpk
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
DATABASE_URL=postgres://admin:admin@127.0.0.1:5433/SynapseFpk

Step 2: Start the Database (Docker)
We are using the pgvector/pgvector:pg16 image for our database to support the MVP 2 AI features (Vector Embeddings).

Open your terminal in the directory containing docker-compose.yml.

Run the following command to start the container in the background:

docker-compose up -d



Step 3: Run Django Migrations
Once the database container is up and running, apply the initial migrations to create the 17 core tables.

Ensure your virtual environment is activated.

Run the migration command:

python manage.py migrate

If successful, you will see a list of OK messages for each applied migration.

🛠️ Developer Notes (Updates & Architecture Decisions)
AI Vector Support: The Docker configuration now uses pgvector to support future AI functionalities.

Security (Utilisateur model): The plain-text motdepasse field has been completely removed from the Utilisateur model. We are relying on Django's built-in authentication system (US01) to handle password hashing (pbkdf2_sha256) and security.

Data Integrity (Evenement model): The organisateur foreign key in the Evenement model has been set to on_delete=models.PROTECT. This prevents the deletion of an organizer if they still have events attached to them, avoiding orphan events in the database.