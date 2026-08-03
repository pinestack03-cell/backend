# Deployment

## Frontend

Hosted on

Vercel

Domain

https://globe1.online

Deployment

Push to GitHub

?

Vercel builds automatically

---

## Backend

Hosted on

Windows VPS

Port

90

---

## Cloudflare Tunnel

Tunnel Name

resume-backend

Domain

resume-api.globe1.online

Forwards

localhost:90

---

## Windows Services

ResumeBackend

CloudflaredTunnel

Both start automatically.

---

## Deployment Process

Frontend

Push

?

GitHub

?

Vercel

Backend

Push

?

GitHub

?

git pull

?

Restart ResumeBackend
