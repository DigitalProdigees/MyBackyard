# Backyard Details Feature Customization

This guide explains how to customize the text and icons for feature items in the backyard details screen.

## Quick Customization

### 1. Using Predefined Feature Sets

The easiest way to customize features is to use the predefined feature sets in `data/featureSets.ts`:

```typescript
// In index.tsx, change these lines:
features: getFeaturesByType('party'), // Options: 'basic', 'luxury', 'family', 'party'
additionalServices: getServicesByType('premium'), // Options: 'basic', 'premium', 'wedding'
```

### 2. Available Feature Types

**Features:**

- `basic` - Simple outdoor features (seating, garden, lighting)
- `party` - Event-focused features (sound system, party furniture, event organizer)
- `luxury` - High-end features (pool, fire pit, BBQ, landscaping)
- `family` - Family-friendly features (play area, shade trees, parking, restroom)

**Services:**

- `basic` - Essential services (catering, decorations)
- `premium` - Full-service options (photography, entertainment, valet parking)
- `wedding` - Wedding-specific services (wedding planning, photography, music, cake)

## Custom Feature Creation

### 1. Create Custom Features Array

```typescript
const customFeatures = [
  {
    icon: "🎯", // Any emoji or icon
    title: "Custom Feature",
    description: "Description of your custom feature"
  },
     {
     iconSource: require('../../../../assets/icons/icWifi.png'), // Image icon from assets
     title: "WiFi Feature",
     description: "High-speed internet access"
   }
];

// Use in backyard data:
features: customFeatures,
```

### 2. Add to Feature Sets

You can also add your custom features to the `featureSets` object in `data/featureSets.ts`:

```typescript
export const featureSets = {
  // ... existing sets
  custom: [
    {
      icon: '🎯',
      title: 'Your Custom Feature',
      description: 'Your description',
    },
    {
      iconSource: require('../../../../assets/icons/icWifi.png'),
      title: 'WiFi Access',
      description: 'High-speed internet connection',
    },
  ],
};
```

## Icon Options

You can use two types of icons:

### 1. Emoji Icons

You can use any emoji as icons. Here are some popular options:

### Outdoor & Nature

- 🌳 Tree
- 🌿 Plant
- 🌸 Flower
- 🍃 Leaf
- 🌞 Sun
- 🌙 Moon

### Entertainment

- 🎵 Music
- 🎪 Entertainment
- 🎭 Theater
- 🎨 Art
- 🎪 Circus

### Food & Dining

- 🍽️ Dining
- 🍖 BBQ
- 🍕 Pizza
- 🍰 Cake
- ☕ Coffee

### Activities

- 🏊 Swimming
- 🔥 Fire
- 🎯 Games
- 🚗 Parking
- 🏠 Building

### Events

- 🎉 Party
- 💒 Wedding
- 🎂 Birthday
- 🎄 Holiday
- 🎪 Event

### 2. Image Icons from Assets

You can also use image icons from your `assets/icons` folder:

```typescript
{
  iconSource: require('../../../../assets/icons/icWifi.png'),
  title: 'WiFi Access',
  description: 'High-speed internet connection'
}
```

**Available Icons in Assets:**

- `icWifi.png` - WiFi/Internet icon
- `icDis.png` - Distance icon
- `loc.png` - Location icon
- `icFilter.png` - Filter icon
- `icEdit.png` - Edit icon
- `icLogout.png` - Logout icon
- `icBELL.png` - Bell/Notification icon
- `icFile.png` - File icon
- `icLink.png` - Link icon
- `icCover.png` - Cover image
- `icS.png` - S icon
- `icc.png` - C icon
- `us.png` - US icon
- `down.png` - Down arrow
- `hide.png` - Hide icon
- `lock.png` - Lock icon
- `back.png` - Back arrow
- `msg_btn.png` - Message button
- `notification.png` - Notification icon
- `google.png` - Google icon
- `union.png` - Union icon
- `payment_done.png` - Payment done
- `bell_2.png` - Bell 2
- `back_arrow_for_appbar.png` - Back arrow for app bar
- `profile.png` - Profile icon
- `image_5.png` - Image 5
- `bookmark.png` - Bookmark icon
- `done.png` - Done icon
- `go.png` - Go icon
- `password.png` - Password icon
- `timer.png` - Timer icon
- `apple.png` - Apple icon
- `search.png` - Search icon
- `user.png` - User icon
- `circle.png` - Circle icon
- `gmail.png` - Gmail icon
- `view_password.png` - View password
- `women.png` - Women icon
- `map.png` - Map icon
- `profile_image.png` - Profile image
- `mail.png` - Mail icon
- `pin.png` - Pin icon
- `tick.png` - Tick icon
- `category.png` - Category icon
- `msg_edit.png` - Message edit
- `email.png` - Email icon

## Component Structure

The `FeatureItem` component accepts these props:

```typescript
interface FeatureItemProps {
  icon?: string; // Emoji or icon (default: '🍴')
  iconSource?: any; // Image icon from assets
  feature: string; // Feature title
  description?: string; // Optional description
}
```

## Styling

The feature items are styled with:

- 48% width (2 items per row)
- Responsive layout
- Icon size: 22px
- Title: 16px, bold
- Description: 13px, gray color

You can modify the styles in `components/FeatureItem.tsx` if needed.
