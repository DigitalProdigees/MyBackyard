// Mock user service for frontend testing
// All backend connections have been removed

interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: any;
  updatedAt: any;
  emailVerified: boolean;
  photoURL: string | null;
  phoneNumber: string | null;
  preferences: {
    notifications: boolean;
    theme: 'light' | 'dark';
  };
}

interface CreateProfileRequest {
  uid: string;
  email: string;
  displayName?: string;
}

interface CreateProfileResponse {
  success: boolean;
  message?: string;
  uid?: string;
  email?: string;
  displayName?: string;
  error?: string;
}

interface GetProfileResponse {
  success: boolean;
  profile?: UserProfile;
  error?: string;
}

class UserService {
  private mockProfiles: Map<string, UserProfile> = new Map();

  constructor() {
    console.log('Mock UserService initialized for frontend testing');
  }

  /**
   * Mock create user profile - stores in memory
   */
  async createProfile(data: CreateProfileRequest): Promise<CreateProfileResponse> {
    try {
      console.log('Mock creating user profile:', data);

      // Check if profile already exists
      if (this.mockProfiles.has(data.uid)) {
        return {
          success: false,
          error: 'Profile already exists',
        };
      }

      // Create mock profile
      const mockProfile: UserProfile = {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName || null,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: false,
        photoURL: null,
        phoneNumber: null,
        preferences: {
          notifications: true,
          theme: 'light',
        },
      };

      this.mockProfiles.set(data.uid, mockProfile);

      console.log('Mock profile created successfully');
      return {
        success: true,
        message: 'Profile created successfully (mock)',
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
      };
    } catch (error) {
      console.error('Mock create profile error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Mock get user profile from memory
   */
  async getProfile(uid: string): Promise<GetProfileResponse> {
    try {
      console.log('Mock fetching user profile for UID:', uid);

      const profile = this.mockProfiles.get(uid);

      if (!profile) {
        return {
          success: false,
          error: 'Profile not found',
        };
      }

      console.log('Mock profile fetched successfully');
      return {
        success: true,
        profile,
      };
    } catch (error) {
      console.error('Mock get profile error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Mock check if user profile exists
   */
  async profileExists(uid: string): Promise<boolean> {
    try {
      const response = await this.getProfile(uid);
      return response.success && !!response.profile;
    } catch (error) {
      console.error('Mock profile exists check error:', error);
      return false;
    }
  }
}

export const userService = new UserService();
export type { UserProfile, CreateProfileRequest, CreateProfileResponse, GetProfileResponse };
