CampusConnect - Backend Setup Guide
This guide explains how to set up the local development environment for the CampusConnect backend, including the database setup with Docker (AI-ready) and Django migrations.

Prerequisites
Docker & Docker Compose

Python 3.x

Virtual environment (recommended) 

Step 1: Environment Variables Setup
From the backend directory, copy `.env.example` to `.env` and set the required values.

Docker Compose reads `backend/.env` for the PostgreSQL container. The host connection uses
`127.0.0.1:5433` (mapped to the container's PostgreSQL port `5432`).

SECRET_KEY=<generate-a-unique-secret-key>
POSTGRES_DB=campusconnect
POSTGRES_USER=campusconnect
POSTGRES_PASSWORD=<choose-a-strong-local-password>
DATABASE_URL=postgres://campusconnect:<choose-a-strong-local-password>@127.0.0.1:5433/campusconnect

Use the same password in `POSTGRES_PASSWORD` and `DATABASE_URL`. URL-encode reserved
characters if the password contains them. Never commit `backend/.env`.

Step 2: Start the Database (Docker)
We are using the pgvector/pgvector:pg16 image for our database to support the MVP 2 AI features (Vector Embeddings).

Open your terminal in the directory containing docker-compose.yml.

Run the following command to start the container in the background:

docker compose up -d



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