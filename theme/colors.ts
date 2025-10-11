export const colors = {
  primary: '#232C60',
  secondary: '#46B649',
  accent: '#BADA8B',
  background: '#232C60',
  surface: '#202857',
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.5)',
    disabled: 'rgba(255, 255, 255, 0.3)',
  },
  button: {
    gradient: ['#AF70AF', '#2E225C', '#AF70AF'],
  },
  input: {
    background: '#202857',
  },
  divider: 'rgba(255, 255, 255, 0.2)',
} as const;

export type Colors = typeof colors; 