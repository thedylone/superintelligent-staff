# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Copy the environment variables template and configure
cp .env.example .env
# Edit .env file with your actual configuration values

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev

# Step 6: In a separate terminal, start the backend server
npm run server
```

## Configuration

### ElevenLabs Setup (Real-time Transcription)

1. Go to [ElevenLabs](https://elevenlabs.io/app/speech-synthesis/api-keys)
2. Sign up for an account and get your API key
3. Add your API key to the `.env` file:
   ```
   ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
   ```

### Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "APIs & Services" > "Credentials"
5. Click "Create Credentials" > "OAuth 2.0 Client ID"
6. Choose "Web application"
7. Add your authorized origins:
   - `http://localhost:8080` (for development)
   - `http://localhost:8081` (alternative dev port)
   - Your production domain
8. Copy the Client ID to your `.env` file as both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`

### Database Setup

Configure your Neo4j database credentials in the `.env` file. You can use Neo4j Aura (free tier available) or a local Neo4j instance.

### LLM API Setup

Configure your LLM API credentials. Supports:
- OpenRouter (recommended for development - has free tier)
- OpenAI API (requires paid account)

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
