# Wedding RSVP - Motasem & Dania 💍

A beautiful bilingual (Arabic/English) wedding RSVP page with Islamic design elements.

## Features

- Elegant wedding-themed design with Islamic touches
- Bilingual support (Arabic & English)
- Guest name and phone number collection
- Accept/Decline response options
- Email notifications to the couple
- Response logging to JSON file
- Ready for Railway.com deployment

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your Gmail credentials:

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**Important:** For Gmail, you need to create an App Password:
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Create a new app password for "Mail"
5. Use that 16-character password in `EMAIL_PASS`

### 3. Run Locally

```bash
npm start
```

Visit `http://localhost:3000` in your browser.

## Deploy to Railway

### Option 1: Deploy via GitHub

1. Push this code to a GitHub repository
2. Go to [Railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub"
4. Select your repository
5. Add environment variables in Railway dashboard:
   - `EMAIL_USER`: Your Gmail address
   - `EMAIL_PASS`: Your Gmail app password
6. Deploy!

### Option 2: Deploy via Railway CLI

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Initialize project:
   ```bash
   railway init
   ```

4. Add environment variables:
   ```bash
   railway variables set EMAIL_USER=your-email@gmail.com
   railway variables set EMAIL_PASS=your-app-password
   ```

5. Deploy:
   ```bash
   railway up
   ```

## API Endpoints

- `GET /` - Main RSVP page
- `POST /api/rsvp` - Submit RSVP response
- `GET /api/responses` - View all responses (for admin)

## File Structure

```
├── server.js          # Express server
├── public/
│   └── index.html     # RSVP page
├── package.json       # Dependencies
├── railway.toml       # Railway config
├── nixpacks.toml      # Nixpacks build config
├── .env.example       # Environment template
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## Response Data

Responses are:
1. Saved to `responses.json` in the project root
2. Emailed to motasem.aljayyousi@gmail.com

---

بارك الله لكما وبارك عليكما وجمع بينكما في خير ❤️
