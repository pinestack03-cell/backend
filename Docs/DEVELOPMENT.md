# Development Guide

## Project Structure

frontend/
backend/
docs/

---

## Requirements

Node.js

Git

npm

---

## Clone

git clone ...

---

## Frontend

cd frontend

npm install

npm run dev

Runs on

http://localhost:5174

---

## Backend

cd backend

npm install

node server.js

Runs on

http://localhost:90

---

## Environment Variables

Frontend

VITE_API_URL=http://localhost:90

Production

VITE_API_URL=https://resume-api.globe1.online

---

## Coding Guidelines

- Use TypeScript.
- Keep components reusable.
- Keep API URLs inside api.ts.
- Never commit secrets.