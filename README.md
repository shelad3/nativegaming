<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1iZyLEY9cZ2Q4YzOSj3LLZbNmMkFfT1RG


## Run Locally

**Prerequisites:** Node.js, MongoDB (Local)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Database Setup (Local MongoDB):**
   - Ensure MongoDB is running on `localhost:27017`.
   - Option: Use Docker to start a containerized instance:
     ```bash
     docker-compose up -d
     ```

3. **Backend Server:**
   - Start the Node.js API server:
     ```bash
     npm run server
     ```

4. **Frontend App:**
   - Set the `GEMINI_API_KEY` in `.env.local`.
   - Run the app:
     ```bash
     npm run dev
     ```
