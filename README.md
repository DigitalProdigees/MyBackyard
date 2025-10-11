# Expo Boilerplate Template 🚀

This is a boilerplate template for [Expo](https://expo.dev) projects, created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app). Use this template to quickly start new Expo projects with a consistent setup.

## Quick Start

1. Clone this repository
   ```bash
   git clone <your-repo-url>
   ```

2. Rename the project
   - Update `app.json` with your project name
   - Update `package.json` with your project name
   - Update any other configuration files that might contain the project name

3. Install dependencies
   ```bash
   npm install
   ```

4. Start the app
   ```bash
   npx expo start
   ```

## Development Options

Once started, you can run the app in:
- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Project Structure

The project uses [file-based routing](https://docs.expo.dev/router/introduction) with the following structure:
- `/app` - Main application code
- `/assets` - Static assets (images, fonts, etc.)
- `/components` - Reusable React components
- `/constants` - App-wide constants and configuration
- `/hooks` - Custom React hooks
- `/services` - API and other service integrations
- `/utils` - Helper functions and utilities

## Customization Steps

1. **Update App Information**
   - Modify `app.json` with your app details
   - Update app icon in `/assets`
   - Update splash screen in `/assets`

2. **Configure Environment**
   - Create `.env` file for environment variables
   - Update API endpoints and configurations

3. **Add Dependencies**
   - Install additional packages as needed
   - Update `package.json` with new dependencies

4. **Setup Authentication**
   - Configure your preferred auth provider
   - Update auth-related environment variables

5. **Customize Theme**
   - Modify theme colors in `/constants/theme.ts`
   - Update global styles as needed

## Learn More

To learn more about developing with Expo, check out these resources:
- [Expo documentation](https://docs.expo.dev/)
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/)
- [Expo Router documentation](https://docs.expo.dev/router/introduction/)

## Community

Join the Expo community:
- [Expo on GitHub](https://github.com/expo/expo)
- [Discord community](https://chat.expo.dev)

## License

This template is MIT licensed. Feel free to use it for your projects!
