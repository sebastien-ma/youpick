# YouPick Frontend

React-based frontend for the YouPick random picker application.

## Features

- Password-protected shared spaces
- Add/remove items from lists
- Random item selection with animation
- Responsive design with Tailwind CSS
- Session storage for password persistence

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will run on http://localhost:5173

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Configuration

The API endpoint can be configured via environment variable:
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001/api)

## Tech Stack

- React 19
- Vite
- Tailwind CSS
- ES6+

## Backend

This frontend requires the YouPick backend server to be running. See the backend README for setup instructions.