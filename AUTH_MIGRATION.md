# Authentication System Migration

## Changes Made

### 1. Switched from SQLite to MySQL for Token Storage

**Problem**: SQLite was causing issues on Render due to:
- Ephemeral filesystem (data lost on deployments)
- File-based database not suitable for containerized environments
- `/tmp` directory permissions and persistence issues

**Solution**: 
- Created `AuthTokenEntity` in MySQL with proper relations
- Added `@OneToOne` relation between `AuthTokenEntity` and `UserEntity`
- Updated `AuthService` to use TypeORM relations for better performance
- Removed SQLite connection from database module

### 2. Updated Token Expiry Configuration

**Changes**:
- Access token expiry: `5m` → `1h`
- Added environment variables for better control:
  - `ACCESS_TOKEN_EXPIRY`: 1h (default)
  - `REFRESH_TOKEN_EXPIRY`: 7d (default)
  - `JWT_EXPIRATION`: 1h (default)

### 3. Updated Render Configuration

**Added Backend Service**:
- Created proper backend service configuration in `render.yaml`
- Configured environment variables for production
- Updated frontend to point to new backend URL

## Database Migration

### Manual Migration Steps

1. **Create the auth_tokens table**:
   ```sql
   -- Run the migration script in your MySQL database
   -- File: apps/server/src/db/migrations/create-auth-tokens-table.sql
   ```

2. **Environment Variables to Set in Render**:
   ```
   MYSQL_HOST=your-mysql-host
   MYSQL_PORT=3306
   MYSQL_USER=your-mysql-user
   MYSQL_PASSWORD=your-mysql-password
   MYSQL_DATABASE=your-mysql-database
   MONGODB_URI=your-mongodb-uri
   MONGODB_DB=your-mongodb-database
   JWT_SECRET=your-jwt-secret
   GOOGLE_OAUTH2_CLIENT=your-google-oauth-client-id
   ```

## Benefits

1. **Reliability**: MySQL is persistent and suitable for production
2. **Scalability**: Better performance for concurrent users
3. **Maintenance**: Easier to backup and manage
4. **Security**: Better access control and user management
5. **Monitoring**: Better logging and debugging capabilities

## Testing

After deployment, test the following:
1. User login/logout
2. Token refresh
3. Session management
4. Inactivity timeout (30 minutes)
5. Token expiry (1 hour)

## Rollback Plan

If issues occur, you can temporarily revert by:
1. Restoring SQLite configuration
2. Updating auth service to use SQLite repository
3. Reverting environment variables

However, this is not recommended for production use. 