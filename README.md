# TestMate AI

TestMate AI is a full-stack QA productivity application for generating, managing, and exporting software test cases. It is designed as a QA internship portfolio project that demonstrates practical test design workflows, authentication, API integration, and clean frontend presentation.

## Key Features

- User registration, login, and JWT-protected dashboard access
- Rule-based test case generation from a feature description
- Supports login, registration, payment, and generic QA test case templates
- Generated test cases include test case ID, scenario, steps, expected result, and priority
- Save generated test cases for later review
- Saved Test Cases page with search and filters
- Search by project name, module name, or test scenario
- Filter saved test cases by priority and module name
- Edit and delete saved test cases
- Summary cards for total, High, Medium, and Low priority saved test cases
- Export generated or selected saved test cases to Excel
- Export generated or selected saved test cases to PDF with report metadata

## Tech Stack

**Frontend**

- React
- Vite
- Tailwind CSS
- Axios
- SheetJS / `xlsx`
- jsPDF

**Backend**

- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Token authentication
- bcryptjs

## Screenshots

Add screenshots here after capturing the running application.

```text
screenshots/
  login-page.png
  test-case-generator.png
  saved-test-cases.png
  pdf-export-report.png
```

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
      app.js
      server.js
  frontend/
    src/
      api/
      components/
      pages/
      App.jsx
      main.jsx
  package.json
  README.md
```

## Prerequisites

- Node.js 18 or later
- npm
- MongoDB local instance or MongoDB Atlas connection string

## Installation

Install dependencies for both the backend and frontend:

```bash
npm run install:all
```

## Environment Variables

Create a `backend/.env` file:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/testmate-ai
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
```

Optional frontend environment file:

```env
VITE_API_URL=http://localhost:5000/api
```

If `VITE_API_URL` is not set, the frontend defaults to `http://localhost:5000/api`.

## How to Run the Backend

Start the backend API:

```bash
npm run dev:backend
```

The backend runs at:

```text
http://localhost:5000
```

Health check:

```text
GET http://localhost:5000/api/health
```

## How to Run the Frontend

Start the frontend development server:

```bash
npm run dev:frontend
```

Open the application:

```text
http://localhost:5173
```

## API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| GET | `/api/health` | API health check | No |
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Log in and receive a JWT | No |
| GET | `/api/auth/me` | Get the authenticated user profile | Yes |
| GET | `/api/tests` | Get saved test cases for the current user | Yes |
| POST | `/api/tests/generate` | Generate rule-based test cases | Yes |
| POST | `/api/tests` | Save a generated test case | Yes |
| PUT | `/api/tests/:id` | Update a saved test case | Yes |
| DELETE | `/api/tests/:id` | Delete a saved test case | Yes |

Protected routes require a bearer token:

```text
Authorization: Bearer <token>
```

## Current Test Case Generation Rules

- If the feature description contains `login`, TestMate AI generates login-related test cases.
- If the feature description contains `register`, TestMate AI generates registration-related test cases.
- If the feature description contains `payment`, TestMate AI generates payment-related test cases.
- Otherwise, it generates generic QA test cases.

## Future Improvements

- Persist test cases in MongoDB instead of temporary in-memory storage
- Add AI-assisted test case generation
- Add export templates for different QA documentation formats
- Add test case status tracking, such as Draft, Reviewed, and Approved
- Add test suite grouping by project and module
- Add pagination for large saved test case lists
- Add automated backend and frontend tests
- Add role-based access for QA leads and team members

## Author

**Your Name**

QA Internship Portfolio Project

Update this section with your name, LinkedIn, GitHub, and portfolio links.
