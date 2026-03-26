# BoloEasy

BoloEasy is a full-stack audio task management platform.

- Admin users can create projects and tasks, upload tasks in bulk, verify users, and review submissions.
- Regular users can view assigned work and upload audio recordings for tasks.

## Monorepo Structure

```text
BoloEasy/
  backend/   Express API + MongoDB
  frontend/  React (Vite) application
```

## Tech Stack

### Backend
- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- Multer (file uploads)
- Cloudinary (audio storage/streaming)

### Frontend
- React + Vite
- React Router
- Axios
- Tailwind CSS
- Lucide React

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- MongoDB instance (local or cloud)
- Cloudinary account

## Environment Setup

### 1) Backend environment file

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/boloeasy
JWT_SECRET=replace_with_a_strong_secret
JWT_EXPIRES_IN=7d
NODE_ENV=development

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2) Frontend environment file

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Note: Frontend already falls back to `http://localhost:5000/api` if the variable is not provided.

## Install Dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Run in Development

Start backend:

```bash
cd backend
npm run dev
```

Start frontend (new terminal):

```bash
cd frontend
npm run dev
```

Default URLs:
- Frontend: http://localhost:5173
- Backend health: http://localhost:5000/health
- API base: http://localhost:5000/api

## Seed Default Admin

```bash
cd backend
npm run seed
```

Default seeded admin:
- Email: admin@boloeasy.com
- Password: Admin@123

Change the password after first login.

## Scripts

### Backend (`backend/package.json`)
- `npm start` - Start server
- `npm run dev` - Start with nodemon
- `npm run seed` - Seed default admin

### Frontend (`frontend/package.json`)
- `npm run dev` - Start Vite dev server
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run lint` - Lint frontend source

## API Overview

Base path: `/api`

### Auth
- POST `/auth/register`
- POST `/auth/login`

### Admin routes
- Prefix: `/admin`
- Protected: requires authenticated user with `admin` role

### User routes
- Prefix: `/user`
- Protected: requires authenticated user with `user` role

## Auth Behavior

- API expects JWT token in `Authorization: Bearer <token>` header.
- Frontend attaches token automatically through Axios interceptor.
- On 401 response, frontend clears local auth data and redirects to login.

## License

No license file is currently included.
