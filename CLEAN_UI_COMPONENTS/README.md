# Clean UI Drawer Components

These are UI-only versions of the drawer components with all functionality removed.

## 📁 Files to Copy:

1. **SidebarMenu.tsx** - Main drawer container
2. **MenuItem.tsx** - Individual menu items
3. **ProfileSection.tsx** - User profile section
4. **CircleButton.tsx** - Circular button for menu trigger
5. **GradientBackground.tsx** - Background gradient

## 📦 Dependencies to Install:

```bash
npm install expo-linear-gradient
```

## 🎯 Usage Example:

```typescript
import React, { useState } from 'react';
import { SidebarMenu } from './components/SidebarMenu';
import { CircleButton } from './components/CircleButton';

export default function YourScreen() {
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  return (
    <>
      {/* Menu trigger button */}
      <CircleButton
        icon={require('../assets/icons/menu.png')}
        onPress={() => setIsMenuVisible(true)}
      />

      {/* Drawer */}
      <SidebarMenu
        isVisible={isMenuVisible}
        onClose={() => setIsMenuVisible(false)}
        profileInfo={{
          name: "John Doe",
          location: "New York",
          email: "john@example.com"
        }}
        onEditProfile={() => console.log('Edit Profile')}
      />
    </>
  );
}
```

## ✨ Features:

- ✅ Clean UI with no functionality
- ✅ All console.log placeholders for actions
- ✅ Same visual design as original
- ✅ Easy to customize and extend
- ✅ No external dependencies except expo-linear-gradient
