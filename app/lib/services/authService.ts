// Simple frontend authentication service for testing
// No backend connections, no OAuth - just basic email/password

interface AuthResponse {
  success: boolean;
  uid?: string;
  email?: string;
  displayName?: string;
  token?: string;
  error?: string;
  message?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupCredentials {
  email: string;
  password: string;
  displayName: string;
}

class AuthService {
  private mockUsers: Map<
    string,
    { email: string; password: string; displayName: string; uid: string }
  > = new Map();
  private mockTokens: Map<string, string> = new Map();

  constructor() {
    console.log('Simple AuthService initialized for frontend testing');
    // Add default test users
    this.mockUsers.set('test@example.com', {
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
      uid: 'mock-uid-1',
    });
    
    // Add the user's email for testing
    this.mockUsers.set('tamoormalik@gmail.com', {
      email: 'tamoormalik@gmail.com',
      password: 'password123',
      displayName: 'Tamoormalik',
      uid: 'mock-uid-2',
    });
  }

  /**
   * Check if user already exists (without creating user)
   */
  async checkUserExists(email: string): Promise<{ exists: boolean; error?: string }> {
    try {
      console.log('Checking if user exists:', email);
      
      const exists = this.mockUsers.has(email);
      console.log('User exists:', exists);
      
      return { exists };
    } catch (error) {
      console.error('Error checking user existence:', error);
      return { 
        exists: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Simple user signup - stores user in memory
   */
  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    try {
      console.log('Signup for:', credentials.email);

      // Check if user already exists
      if (this.mockUsers.has(credentials.email)) {
        return {
          success: false,
          error: 'User already exists',
        };
      }

      // Create mock user
      const uid = `mock-uid-${Date.now()}`;
      const token = `mock-token-${Date.now()}`;

      this.mockUsers.set(credentials.email, {
        email: credentials.email,
        password: credentials.password,
        displayName: credentials.displayName,
        uid,
      });

      this.mockTokens.set(uid, token);

      console.log('Signup successful');
      return {
        success: true,
        uid,
        email: credentials.email,
        displayName: credentials.displayName,
        token,
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Simple user signin - validates against mock users
   */
  async signin(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('Signin for:', credentials.email);

      const user = this.mockUsers.get(credentials.email);

      if (!user || user.password !== credentials.password) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Generate new token
      const token = `mock-token-${Date.now()}`;
      this.mockTokens.set(user.uid, token);

      console.log('Signin successful');
      return {
        success: true,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        token,
      };
    } catch (error) {
      console.error('Signin error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Simple session verification - validates mock tokens
   */
  async verifySession(token: string): Promise<AuthResponse> {
    try {
      console.log('Verifying session');

      // Find user by token
      for (const [uid, storedToken] of this.mockTokens.entries()) {
        if (storedToken === token) {
          const user = Array.from(this.mockUsers.values()).find(u => u.uid === uid);
          if (user) {
            return {
              success: true,
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              token,
            };
          }
        }
      }

      return {
        success: false,
        error: 'Invalid token',
      };
    } catch (error) {
      console.error('Session verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Simple signout - removes token
   */
  async signout(token?: string): Promise<AuthResponse> {
    try {
      console.log('Signing out');

      if (token) {
        // Remove token
        for (const [uid, storedToken] of this.mockTokens.entries()) {
          if (storedToken === token) {
            this.mockTokens.delete(uid);
            break;
          }
        }
      }

      console.log('Signout successful');
      return { success: true };
    } catch (error) {
      console.error('Signout error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Simple password reset - always succeeds for testing
   */
  async requestPasswordReset(email: string): Promise<AuthResponse> {
    try {
      console.log('Password reset request for:', email);

      // Check if user exists
      if (!this.mockUsers.has(email)) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      console.log('Password reset request successful');
      return { success: true, message: 'Password reset email sent (mock)' };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

export const authService = new AuthService();
export type { AuthResponse, LoginCredentials, SignupCredentials };
