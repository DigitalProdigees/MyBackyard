// Provide minimal no-op session service

interface User {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

class SessionService {
  async login(email: string, password: string): Promise<LoginResponse> {
    console.log('SessionService: authentication disabled');
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }
    return { success: false, error: 'Authentication disabled' };
  }

  /**
   * Check if user has a valid session
   */
  async checkSession(): Promise<{ token: string | null; user: User | null }> {
    console.log('SessionService: no existing session');
    return { token: null, user: null };
  }

  /**
   * Logout - clear session data
   */
  async logout(): Promise<void> {
    console.log('SessionService: logout is a no-op');
  }

  /**
   * Get current token
   */
  async getToken(): Promise<string | null> {
    return null;
  }
}

export const sessionService = new SessionService();
export type { User, LoginResponse };
