1. Go to: https://github.com/swaritbkp/MatchBuddy/settings/secrets/actions
2. Click "New repository secret" for each of these:

Secret Name                  | Where to get it
-----------------------------|------------------------------------------
GCP_PROJECT_ID               | console.cloud.google.com → project ID shown in header
GCP_SA_KEY                   | IAM → Service Accounts → your account → Keys → Add Key → JSON → paste entire file content
GEMINI_API_KEY               | aistudio.google.com/apikey
GOOGLE_MAPS_API_KEY          | console.cloud.google.com/apis/credentials
FIREBASE_DATABASE_URL        | Firebase Console → Realtime Database → URL
FIREBASE_STORAGE_BUCKET      | Firebase Console → Storage → bucket name
FIREBASE_FCM_SERVER_KEY      | Firebase Console → Project Settings → Cloud Messaging → Server key
FIREBASE_SERVICE_ACCOUNT_JSON| Firebase Console → Project Settings → Service Accounts → Generate new private key → paste entire JSON content

3. After adding all secrets, go to:
   https://github.com/swaritbkp/MatchBuddy/actions
   and manually trigger the workflow OR just push any commit.
4. The workflow will build and deploy automatically.
   Live URL will appear in the Actions log under "Output Live URL" step.
