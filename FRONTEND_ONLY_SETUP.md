# Simple Frontend-Only Setup

This project has been configured to run without any backend connections or OAuth for simple frontend testing purposes.

## Changes Made

### 1. Authentication Services

- **`app/lib/services/authService.ts`** - Simple email/password authentication with in-memory storage
- **`app/lib/services/userService.ts`** - Mock user profile service
- **Removed** - All OAuth services (Google, Apple, etc.)

### 2. Configuration

- **`app.config.js`** - Removed backend URL, OAuth plugins, and complex configurations
- **`app/lib/context/AuthContext.tsx`** - Simplified authentication flow

### 3. Dependencies Removed

- `expo-auth-session` - Google OAuth
- `expo-apple-authentication` - Apple Sign-In

## Simple Functionality

### Authentication (Email/Password Only)

- **Sign Up**: Creates users stored in memory
- **Sign In**: Validates against mock user database
- **Session Management**: Simple token validation and storage
- **Password Reset**: Mock password reset requests

### User Profiles

- **Profile Creation**: Stores mock profiles in memory
- **Profile Retrieval**: Returns mock profile data
- **Profile Existence**: Checks against mock profile database

## Testing

### Default Test User

- **Email**: `test@example.com`
- **Password**: `password123`
- **Display Name**: `Test User`

### Features Available for Testing

- ✅ User registration and login (email/password only)
- ✅ Session management
- ✅ User profile management
- ✅ Password reset requests (mock)
- ✅ All UI components and navigation
- ✅ No OAuth complexity

### What's Removed

- ❌ Google OAuth
- ❌ Apple Sign-In
- ❌ All backend API calls
- ❌ Complex authentication flows
- ❌ OAuth configuration

## Running the App

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Start the development server**:

   ```bash
   npm start
   ```

3. **Test on device/simulator**:
   - Use the test credentials above
   - Simple email/password authentication
   - No backend server required
   - No OAuth setup needed

## Environment Variables

**No environment variables required!** This is a completely self-contained frontend setup.

## Notes

- All data is stored in memory and will be lost when the app restarts
- Simple authentication without OAuth complexity
- No network requests are made to external services
- Perfect for basic frontend development and UI testing
- Focus on core app functionality without authentication complexity

## Restoring OAuth Later (Optional)

If you want to add OAuth back later:

1. Install required packages: `npm install expo-auth-session expo-apple-authentication`
2. Add OAuth plugins to `app.config.js`
3. Create OAuth service files
4. Configure Google/Apple developer accounts

## Restoring Backend Connections

To restore backend functionality later:

1. Update service files to use real API endpoints
2. Restore backend URL configuration in `app.config.js`
3. Update environment variables for backend services
4. Test with actual backend server
