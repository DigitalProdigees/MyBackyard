/**
 * Icon paths for the application
 * All icons are stored in the assets/icons directory
 */

export const Icons = {
  ictime: require('../assets/icons/ictime.png'),
  icU: require('../assets/icons/icU.png'),
  // Authentication icons
  loc: require('../assets/icons/loc.png'),
  mail: require('../assets/icons/mail.png'),
  lock: require('../assets/icons/lock.png'),
  viewPassword: require('../assets/icons/view_password.png'),
  eye: require('../assets/icons/view_password.png'),
  hide: require('../assets/icons/hide.png'),
  google: require('../assets/icons/google.png'),
  apple: require('../assets/icons/apple.png'),
  gmail: require('../assets/icons/gmail.png'),
  timer: require('../assets/icons/timer.png'),
  done: require('../assets/icons/done.png'),
  direct: require('../assets/icons/direct.png'),

  // Navigation icons
  back: require('../assets/icons/back.png'),
  bookmark: require('../assets/icons/bookmark.png'),
  go: require('../assets/icons/go.png'),
  union: require('../assets/icons/union.png'),

  // Renter screen icons
  category: require('../assets/icons/category.png'),
  notification: require('../assets/icons/notification.png'),
  pin: require('../assets/icons/pin.png'),
  search: require('../assets/icons/search.png'),
} as const;

// Type for icon names
export type IconName = keyof typeof Icons;
