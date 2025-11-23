# YouPick Backend

Backend API server for the YouPick random picker application.

## Features

- Password-based namespacing for shared spaces
- RESTful API endpoints
- Rate limiting and security headers
- CORS support
- File-based data persistence

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Start the server:
```bash
npm start
```

The server will run on http://localhost:3001

## API Endpoints

All endpoints require `X-Password` header for authentication:

- `GET /api/items` - Get all items in the namespace
- `POST /api/items` - Add a new item
- `DELETE /api/items/:index` - Delete an item by index
- `GET /api/picked` - Get the last picked item
- `POST /api/picked` - Save a picked item
- `GET /health` - Health check (no auth required)
- `GET /healthz` - Health check for cloud platforms like Render, Kubernetes (no auth required)

## Environment Variables

See `.env.example` for available configuration options:
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_URL` - PostgreSQL connection string (required)
- `ALLOWED_ORIGINS` - CORS allowed origins
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in ms
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window

## Deployment

### Deploying to Render

1. Create a PostgreSQL database on Render
2. Set the following environment variables in your Render service:
   - `NODE_ENV=production`
   - `DATABASE_URL` - Will be automatically set by Render when you connect the PostgreSQL database
   - `ALLOWED_ORIGINS` - Your frontend URL(s), comma-separated if multiple

3. The application will automatically handle SSL certificates for the database connection

**Note:** The application is configured to handle self-signed certificates commonly used by managed PostgreSQL instances on cloud platforms.

## Security

See `API_SECURITY_GUIDE.md` for detailed security implementation notes.