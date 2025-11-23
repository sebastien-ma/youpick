// Frontend Configuration

const config = {
  // API endpoint
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',

  // Public app identifier
  APP_ID: import.meta.env.VITE_PUBLIC_APP_ID || 'youpick-app',

  // Feature flags
  FEATURES: {
    enableStats: true,
  }
};

export default config;