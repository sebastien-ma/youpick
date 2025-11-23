# YouPick

A full-stack random picker application with password-protected shared spaces. Perfect for making group decisions!

## Project Structure

```
youpick/
├── api/              # Express.js API server
│   ├── server.js     # Main server file
│   ├── data.json     # Data storage
│   ├── package.json  # API dependencies
│   └── .env          # Environment configuration
│
└── web/              # React web application
    ├── src/          # React components and source code
    ├── public/       # Static assets
    ├── package.json  # Web app dependencies
    └── index.html    # Entry HTML file
```

## Features

- 🔐 Password-protected shared spaces
- 👥 Multiple users can share the same space with a password
- 🎲 Random item selection from lists
- ✨ Clean, modern UI with animations
- 🛡️ Secure API with rate limiting and CORS protection
- 💾 Persistent data storage

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm

### Setup Instructions

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd youpick
```

2. **API Setup:**
```bash
cd api
npm install
cp .env.example .env
npm start
```
The API server will run on http://localhost:3001

3. **Web App Setup (in a new terminal):**
```bash
cd web
npm install
npm run dev
```
The web development server will run on http://localhost:5173

## Running the Application

You need to run both the API and web servers:

### Terminal 1 - API Server:
```bash
cd api
npm start
```

### Terminal 2 - Web Application:
```bash
cd web
npm run dev
```

Then open http://localhost:5173 in your browser.

## Development

### API Development

The API is a Node.js/Express server located in the `api/` folder.

Available scripts:
- `npm start` - Start the server
- `npm run dev` - Start with auto-reload (if configured)

Configuration:
- Edit `.env` file for environment variables
- See `api/.env.example` for available options

### Web Development

The web app is a React application with Vite located in the `web/` folder.

Available scripts:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

Configuration:
- Create a `.env` file if you need to change the API URL
- Default API URL is http://localhost:3001/api

## Production Build

### Building the Web App:
```bash
cd web
npm run build
```
This creates a `dist/` folder with production-ready files.

### Deploying:
- **API**: Can be deployed to services like Heroku, Railway, or Render
- **Web**: Can be deployed to services like Vercel, Netlify, or served as static files

## Environment Configuration

### API (.env)
```bash
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Web (.env)
```bash
API_SERVER_URL=http://localhost:3001/api
```

## Security

The application uses password-based namespacing for data isolation:
- Each password creates a unique namespace
- Passwords are hashed (SHA-256) before being used as namespace identifiers
- No user accounts or personal data storage required
- See `api/API_SECURITY_GUIDE.md` for detailed security information

## Tech Stack

### API
- Node.js
- Express.js
- Helmet (security headers)
- CORS
- Express Rate Limit

### Web
- React 19
- Vite
- Tailwind CSS

## API Documentation

All API endpoints require `X-Password` header for authentication:

- `GET /api/items` - Get all items in the namespace
- `POST /api/items` - Add a new item
- `DELETE /api/items/:index` - Delete an item by index
- `GET /api/picked` - Get the last picked item
- `POST /api/picked` - Save a picked item
- `GET /health` - Health check (no auth required)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

ISC