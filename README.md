# TestMate AI

TestMate AI is a simple full-stack web application scaffold with:

- React + Vite + Tailwind CSS frontend
- Node.js + Express.js backend
- MongoDB with Mongoose
- JWT authentication

## Project Structure

```text
testmate-ai/
  backend/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
  frontend/
    src/
      api/
      components/
      pages/
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB running locally or a MongoDB Atlas connection string

## Setup

Install dependencies for both apps:

```bash
npm run install:all
```

Create backend environment file:

```bash
cp backend/.env.example backend/.env
```

Update `backend/.env` if needed:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/testmate-ai
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
```

Create frontend environment file:

```bash
cp frontend/.env.example frontend/.env
```

## Run the App

Start the backend:

```bash
npm run dev:backend
```

Start the frontend in another terminal:

```bash
npm run dev:frontend
```

Open:

```text
http://localhost:5173
```

The API runs at:

```text
http://localhost:5000/api
```

## API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/tests`

The `/api/auth/me` and `/api/tests` routes require a JWT bearer token.
