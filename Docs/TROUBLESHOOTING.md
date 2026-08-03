# Troubleshooting

## Backend not responding

Restart

net stop ResumeBackend

net start ResumeBackend

---

## Tunnel offline

Restart

net stop CloudflaredTunnel

net start CloudflaredTunnel

---

## Frontend cannot reach backend

Check

https://resume-api.globe1.online/api/resources/latest

---

## CORS

Allowed Origins

https://globe1.online

https://www.globe1.online

localhost:5174

---

## Vercel not updating

Push latest code

Check Deployments

Redeploy

---

## Database

Verify SQLite file exists.

---

## Logs

Backend

NSSM

Cloudflared

Windows Event Viewer