# Authentication Debugging Guide

## Issue: Login successful but /auth/me returns 401

### Step 1: Check Database Status
Visit: `https://htt-ekpa.onrender.com/api/auth/db-status`

This will tell us if:
- Database connection is working
- `auth_tokens` table exists
- There are any tokens in the database

### Step 2: Check Token Debug Info
Visit: `https://htt-ekpa.onrender.com/api/auth/debug`

This will show:
- If cookies are being sent
- If Authorization header is present
- Token values (first 20 characters)

### Step 3: Manual Database Check

If the database status shows errors, you need to run the migration:

```sql
-- Run this in your MySQL database
CREATE TABLE IF NOT EXISTS `auth_tokens` (
  `sessionId` varchar(36) NOT NULL,
  `userId` bigint unsigned NOT NULL,
  `accessToken` varchar(512) NOT NULL,
  `refreshToken` varchar(512) DEFAULT NULL,
  `accessTokenExpiresAt` datetime NOT NULL,
  `refreshTokenExpiresAt` datetime DEFAULT NULL,
  `lastActivityAt` datetime NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`sessionId`),
  KEY `IDX_auth_tokens_userId` (`userId`),
  KEY `IDX_auth_tokens_accessToken` (`accessToken`),
  KEY `IDX_auth_tokens_refreshToken` (`refreshToken`),
  CONSTRAINT `FK_auth_tokens_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Step 4: Check Environment Variables

Make sure these are set in Render:
- `JWT_SECRET` (must match between JWT module and strategy)
- `ACCESS_TOKEN_EXPIRY` = "1h"
- `REFRESH_TOKEN_EXPIRY` = "7d"
- `JWT_EXPIRATION` = "1h"

### Step 5: Test Login Flow

1. Clear browser cookies
2. Login with valid credentials
3. Check browser dev tools → Application → Cookies
4. Verify `access_token` cookie is set
5. Try accessing `/auth/me` endpoint

### Step 6: Check Server Logs

Look for these log messages in Render logs:
- "Token validation successful for user: [username]"
- "Token not found in database"
- "Token expired"
- "Session expired due to inactivity"

### Common Issues:

1. **Database table doesn't exist**: Run the migration
2. **JWT secret mismatch**: Check environment variables
3. **Token not being saved**: Check login flow
4. **Cookie not being sent**: Check CORS and cookie settings
5. **Token expired**: Check expiry configuration

### Quick Fixes:

1. **If database table missing**:
   ```sql
   -- Run the migration script
   ```

2. **If JWT secret issue**:
   - Set `JWT_SECRET` in Render environment variables
   - Redeploy the application

3. **If cookies not working**:
   - Check if frontend is using `withCredentials: true`
   - Verify CORS settings on backend

### Test Commands:

```bash
# Test database connection
curl https://htt-ekpa.onrender.com/api/auth/db-status

# Test debug endpoint
curl https://htt-ekpa.onrender.com/api/auth/debug

# Test login (replace with real credentials)
# Login and store cookies in $session# Correct way to POST login and save session
$response = Invoke-RestMethod -Method POST `
  -Uri "https://htt-ekpa.onrender.com/api/auth/login" `
  -Body '{"username":"admin","password":"admin123"}' `
  -ContentType "application/json" `
  -SessionVariable session
# Use $session for next request to keep cookies
$me = Invoke-RestMethod -Uri "https://htt-ekpa.onrender.com/api/auth/me" -WebSession $session
# Output result
$me
``` 
