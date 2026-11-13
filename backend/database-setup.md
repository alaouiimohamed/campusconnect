CampusConnect - Backend Setup Guide
This guide explains how to set up the local development environment for the CampusConnect backend, including the database setup with Docker (AI-ready) and Django migrations.

Prerequisites
Docker & Docker Compose

Python 3.x

Virtual environment (recommended) 

Step 1: Environment Variables Setup
From the backend directory, copy `.env.example` to `.env` and set the required values.

Docker Compose does not read `backend/.env`: the PostgreSQL container settings are defined
directly in `docker-compose.yml` (database `campusconnect`, user `campusconnect`, password
`campusconnect`). The container port `5432` is published on the host as `127.0.0.1:5432`.

In `backend/.env`, set at least:

SECRET_KEY=<generate-a-unique-secret-key>
DATABASE_URL=postgres://campusconnect:campusconnect@127.0.0.1:5432/campusconnect

These credentials are for local development only. To use Neon instead of Docker, paste the
Neon connection string into `DATABASE_URL` (see `backend/.env.example`). Never commit
`backend/.env`.

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

Data Integrity (Evenement model): The organisateur foreign key in the Evenement model has been set to on_delete=models.RESTRICT. This prevents the deletion of an organizer if they still have events attached to them, avoiding orphan events in the database.
