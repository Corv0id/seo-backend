# SEO Audit Backend

A secure REST API built with **Node.js, Express, MongoDB & Mongoose** that performs **Google PageSpeed** and **SERPStack** audits for authenticated users.

---

## ⚡ Quick Start

```bash
# 1. Clone & install
git clone https://github.com/Corv0id/seo-backend.git
cd seo-backend
npm install

# 2. Environment
cp .env.example .env
# edit .env with your keys

# 3. Run
npm run dev        # development
npm start          # production

## 🔐 Environment Variables

| Key                 | Description                                |
|---------------------|--------------------------------------------|
| `PORT`              | Server port (default `5000`)               |
| `MONGO_URI`         | MongoDB connection string                  |
| `JWT_SECRET`        | JWT signing secret                         |
| `GOOGLE_API_KEY`    | Google PageSpeed Insights API key          |
| `SERPSTACK_API_KEY` | SERPStack API key                          |

## 🛠️ Scripts

| Command     | Action                   |
|-------------|--------------------------|
| `npm run dev` | Start server (`node app.js`) |

## 📡 API Endpoints

| Method | Endpoint        | Auth | Body / Query                           | Description               |
|--------|-----------------|------|----------------------------------------|---------------------------|
| POST   | `/api/register` | –    | `{ email, username, password, role? }` | Register new user         |
| POST   | `/api/login`    | –    | `{ email, password }`                  | Login & receive JWT       |
| POST   | `/api/logout`   | ✔︎   | –                                      | Invalidate refresh-token  |
| GET    | `/api/profile`  | ✔︎   | –                                      | Get authenticated user    |
| POST   | `/api/audits/`  | ✔︎   | `{ domain, type, query? }`             | Create audit              |
| GET    | `/api/audits/`  | ✔︎   | –                                      | List user audits          |