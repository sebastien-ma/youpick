# API Security Implementation Guide

## Current Implementation

Your application now uses password-based namespacing with the following security features:

### Backend Security (server.js)
- ✅ **Password-Based Namespacing**: All endpoints require `X-Password` header
- ✅ **Rate Limiting**: Global IP-based rate limiting
- ✅ **CORS Restrictions**: Only specified origins allowed
- ✅ **Helmet Security Headers**: XSS, clickjacking, MIME-sniffing protection
- ✅ **Input Validation**: Length limits, type checking, XSS prevention
- ✅ **Error Handling**: Safe error messages, no stack traces in production
- ✅ **Request Logging**: All API calls logged with timestamps
- ✅ **Write Queue**: Prevents race conditions on file writes
- ✅ **Payload Size Limits**: 1MB max request size

### Frontend Implementation
- ✅ **Password Authentication**: Users enter a password to access their shared space
- ✅ **Session Storage**: Password stored in sessionStorage for convenience
- ✅ **Error Handling**: Graceful error messages for users
- ✅ **No API Keys**: Removed API key authentication for simplicity

## How It Works

### Password-Based Namespacing
- Users enter a password to create/access a shared space
- The password is hashed (SHA-256) to create a unique namespace
- All users with the same password share the same data
- Different passwords = completely separate data spaces

### Security Features
1. **Data Isolation**: Each password creates an isolated namespace
2. **No User Accounts**: No registration or personal data storage
3. **Session-Based**: Passwords stored only in browser session storage
4. **Hashed Storage**: Server stores hashed namespace identifiers, not raw passwords

## Environment Variables Setup

```bash
# Production .env
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100    # requests per window
```

## Testing Security

1. **Test Password Requirement**:
   ```bash
   # Should fail (no password)
   curl http://localhost:3001/api/items

   # Should succeed
   curl -H "X-Password: your-password" http://localhost:3001/api/items
   ```

2. **Test Rate Limiting**:
   ```bash
   # Run this multiple times quickly
   for i in {1..101}; do
     curl -H "X-Password: test" http://localhost:3001/api/items
   done
   ```

3. **Test CORS**:
   ```javascript
   // From a different origin
   fetch('http://localhost:3001/api/items')
     .catch(err => console.log('CORS blocked:', err))
   ```

## Security Best Practices

### Password Guidelines
- ✅ Use strong, unique passwords for important spaces
- ✅ Share passwords only with trusted users
- ✅ Consider using generated passwords for better security
- ⚠️ Remember: Anyone with the password can access the data

### Data Protection
- ✅ All inputs are validated and sanitized
- ✅ Use HTTPS in production to protect passwords in transit
- ✅ Rate limiting prevents abuse
- ✅ CORS restricts which domains can access the API

### Production Deployment

1. **Use HTTPS**: Essential to protect passwords during transmission
2. **Set CORS Origins**: Update ALLOWED_ORIGINS for your domain
3. **Configure Rate Limits**: Adjust based on expected usage
4. **Monitor Logs**: Watch for unusual patterns or abuse

## Common Vulnerabilities Addressed

1. **No API Keys to Leak**: Removed API key authentication entirely
2. **Input Validation**: Prevents SQL injection, XSS, command injection
3. **Rate Limiting**: Prevents DoS attacks
4. **CORS Configuration**: Restricts cross-origin access
5. **Security Headers**: Helmet provides additional protection
6. **Error Handling**: No sensitive information in error messages

## Future Enhancements

Consider these improvements for enhanced security:

1. **Password Strength Requirements**: Enforce minimum complexity
2. **Brute Force Protection**: Add delays after failed attempts
3. **Audit Logging**: Track all data modifications
4. **Data Encryption**: Encrypt stored data with password-derived keys
5. **Expiring Sessions**: Auto-logout after inactivity

## Resources

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## Support

This is a simple, secure solution for shared spaces without user accounts. For applications requiring user-specific data or advanced authentication, consider implementing:
- JWT authentication
- OAuth integration
- Database-backed user management

Remember: **Always use HTTPS in production to protect passwords!**