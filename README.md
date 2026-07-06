<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# iCompetency

React/Vite frontend plus a raw PHP/MySQL backend for server-authoritative user profiles, progression, and AI proxying.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `backend/config.sample.php` to `backend/config.php` on your PHP host and set DB, CORS, and AvalAI settings there.
3. Set `VITE_API_BASE_URL` only if the API is not served from `/backend`.
4. Run the app:
   `npm run dev`

Do not put AI provider keys in frontend `.env` files. Browser AI calls go through authenticated `POST /ai/generate` on the PHP backend.
