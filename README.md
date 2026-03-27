# NSE Bhavcopy Analytics

A production-ready tool to track and analyze NSE India stock data.

## Setup Instructions

1. **Environment Variables**:
   The app uses `APP_URL` for internal routing. Ensure it's set in your environment.

2. **Running Locally**:
   ```bash
   npm install
   npm run dev
   ```

3. **Data Sync**:
   - The app automatically attempts to download the latest bhavcopy every day at 6:00 PM IST.
   - You can manually trigger a sync using the "Sync Latest Data" button on the dashboard.

4. **Project Structure**:
   - `server.ts`: Express server and API endpoints.
   - `src/services/db.ts`: SQLite database management.
   - `src/services/nseService.ts`: Data downloading and processing logic.
   - `src/App.tsx`: React dashboard frontend.

## Windows Task Scheduler (Alternative)
To run the downloader script independently on Windows:
1. Create a `.bat` file:
   ```batch
   cd /path/to/project
   node -e "require('./src/services/nseService').downloadLatestBhavcopy()"
   ```
2. Open Task Scheduler -> Create Basic Task.
3. Set trigger to "Daily" at 18:30.
4. Action: "Start a program" -> Select your `.bat` file.
