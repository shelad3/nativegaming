# Firebase & Google Auth Setup Guide

Follow these steps to get your real credentials for the NativeCodeX platform.

## 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and name it (e.g., `NativeCodeX`).
3. (Optional) Disable Google Analytics if you want a faster setup.
4. Click **Create project**.

## 2. Enable Google Authentication
1. In the sidebar, go to **Build** > **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, click **Add new provider**.
4. Select **Google**.
5. Enable the toggle, provide a "Project support email", and click **Save**.

## 3. Register your Web App
1. Go to the **Project Overview** (house icon in the top left).
2. Click the **Web** icon (`</>`) to add an app.
3. Enter an app nickname (e.g., `NativeCodeX-Web`).
4. Click **Register app**.

## 4. Get your Firebase Config
1. You will see a `const firebaseConfig` block. It looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```
2. **Copy these values.**

## 5. Update your Environment Variables
Open your project's `.env.local` file and add/update these lines:
```bash
VITE_FIREBASE_API_KEY=your_copied_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_copied_auth_domain
VITE_FIREBASE_PROJECT_ID=your_copied_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_copied_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_copied_sender_id
VITE_FIREBASE_APP_ID=your_copied_app_id
```

## 6. Security Note
Never commit your real `.env.local` file to GitHub. It is already included in your `.gitignore`.
