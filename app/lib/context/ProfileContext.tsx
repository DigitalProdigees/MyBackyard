import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProfileData {
  fullName: string;
  email: string;
  country: string;
  city: string;
  state: string;
  zipCode: string;
}

interface ProfileContextType {
  profileData: ProfileData;
  updateProfileData: (data: ProfileData) => void;
  clearProfileData: () => void;
}

const defaultProfileData: ProfileData = {
  fullName: 'John Doe',
  email: 'john.doe@example.com',
  country: 'US',
  city: 'New York',
  state: 'Wyoming',
  zipCode: '54000',
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileProviderProps {
  children: ReactNode;
}

export function ProfileProvider({ children }: ProfileProviderProps): React.ReactElement {
  const [profileData, setProfileData] = useState<ProfileData>(defaultProfileData);

  const updateProfileData = (data: ProfileData) => {
    setProfileData(data);
  };

  const clearProfileData = () => {
    setProfileData(defaultProfileData);
  };

  const value: ProfileContextType = {
    profileData,
    updateProfileData,
    clearProfileData,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextType {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
