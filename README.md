# Resume Management System

Internal resume and candidate management platform developed for Globe1.

---

# Purpose

The Resume Management System is used to manage incoming candidate resumes, organize candidate information, search existing records, and automate resume processing.

This repository contains both the frontend and backend applications.

---

# Production URLs

Frontend

```
https://globe1.online
```

Backend API

```
https://resume-api.globe1.online
```

---

# Technology Stack

## Frontend

- React
- TypeScript
- Vite
- TailwindCSS

## Backend

- Node.js
- Express.js
- SQLite
- Multer

## Infrastructure

- Vercel
- Windows VPS
- Cloudflare Tunnel
- Cloudflare DNS
- NSSM

---

# Repository Structure

```
/
+-- frontend/
+-- backend/
+-- README.md
```

---

# Local Development

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on

```
http://localhost:5174
```

---

## Backend

```bash
cd backend
npm install
node server.js
```

Runs on

```
http://localhost:90
```

---

# Environment Variables

Frontend

```
VITE_API_URL=http://localhost:90
```

Production

```
VITE_API_URL=https://resume-api.globe1.online
```

---

# Production Architecture

```
                        Hostinger
                    (Domain Registrar)
                            ¦
                            ?
                    Cloudflare DNS
                            ¦
        +---------------------------------------+
        ¦                                       ¦
        ?                                       ?
globe1.online                    resume-api.globe1.online
        ¦                                       ¦
        ?                                       ?
      Vercel                          Cloudflare Tunnel
        ¦                                       ¦
        +---------------------------------------+
                            ?
                      Windows VPS
                            ¦
                    ResumeBackend Service
                            ¦
                         Express API
                            ¦
                         SQLite DB
```

---

# Windows Services

Backend

```
ResumeBackend
```

Cloudflare Tunnel

```
CloudflaredTunnel
```

Both services start automatically on Windows boot through NSSM.

---

# Cloudflare

DNS is managed through Cloudflare.

Important DNS records:

```
globe1.online
```

? Vercel

```
www.globe1.online
```

? Vercel

```
resume-api.globe1.online
```

? Cloudflare Tunnel

---

# Deployment

## Frontend

1. Push changes to GitHub.
2. Vercel automatically builds and deploys.

---

## Backend

1. Push changes to GitHub.
2. Pull latest changes on the VPS:

```bash
git pull
```

3. Restart backend:

```cmd
net stop ResumeBackend
net start ResumeBackend
```

---

# Cloudflare Tunnel

If configuration changes:

Restart the tunnel service:

```cmd
net stop CloudflaredTunnel
net start CloudflaredTunnel
```

---

# Database

Current database:

```
SQLite
```

Database files remain on the VPS.

Uploaded resumes are stored inside:

```
backend/uploads
```

---

# Notes

- Backend runs on port **90**.
- Cloudflare Tunnel forwards HTTPS traffic to localhost:90.
- CORS must include:
  - https://globe1.online
  - https://www.globe1.online
  - localhost:5174
- Frontend communicates only through:

```
https://resume-api.globe1.online
```

---

# Maintainers

Internal Globe1 development team.