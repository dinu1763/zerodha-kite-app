# Zerodha Kite Trading Application

A Next.js application that integrates with Zerodha Kite API for trading functionality. This app handles OAuth authentication flow and provides a foundation for building trading applications.

## Features

- ✅ Zerodha Kite OAuth integration
- ✅ Secure token exchange
- ✅ Responsive UI with Tailwind CSS
- ✅ Ready for Vercel deployment
- ✅ Environment variable configuration

## Prerequisites

1. A Zerodha trading account
2. Node.js 18+ installed
3. A Vercel account (for deployment)

## Setup Instructions

### 1. Clone and Install

```bash
cd zerodha-kite-app
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env.local
```

### 3. Create Zerodha Kite Connect App

1. Go to [Zerodha Kite Connect Developer Console](https://developers.kite.trade/create)
2. Create a new app with the following details:
   - **App Type**: Connect (recommended for full API access)
   - **App Name**: Your app name
   - **Redirect URL**: `http://localhost:3000/api/auth/callback` (for local development)
   - **Postback URL**: Leave empty or use your webhook URL

3. After creating the app, you'll get:
   - **API Key** (public)
   - **API Secret** (private)

### 4. Update Environment Variables

Edit `.env.local` with your actual values:
```env
NEXT_PUBLIC_ZERODHA_API_KEY=your_actual_api_key
ZERODHA_API_SECRET=your_actual_api_secret
NEXTAUTH_URL=http://localhost:3000
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Deployment to Vercel

### 1. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### 2. Configure Production Environment Variables

In your Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add the following variables:
   - `NEXT_PUBLIC_ZERODHA_API_KEY`: Your Zerodha API key
   - `ZERODHA_API_SECRET`: Your Zerodha API secret
   - `NEXTAUTH_URL`: Your production URL (e.g., `https://your-app.vercel.app`)

### 3. Update Zerodha App Redirect URL

1. Go back to [Zerodha Developer Console](https://developers.kite.trade/apps)
2. Edit your app
3. Update the **Redirect URL** to: `https://your-app.vercel.app/api/auth/callback`
4. Save the changes

## API Routes

- `/api/auth/callback` - Handles OAuth callback from Zerodha
- `/api/auth/token` - Exchanges request token for access token

## Pages

- `/` - Home page (redirects to login)
- `/login` - Zerodha OAuth login page
- `/dashboard` - User dashboard after successful authentication
- `/auth/error` - Error page for authentication failures

## Security Notes

- API secrets are only used server-side
- Access tokens should be stored securely (consider httpOnly cookies for production)
- Always use HTTPS in production
- Validate all API responses

## Next Steps

After successful setup, you can extend this application with:
- Portfolio management
- Order placement
- Real-time market data
- Trading strategies
- Risk management tools

## Troubleshooting

### Common Issues

1. **"API credentials not configured"**
   - Ensure environment variables are set correctly
   - Restart the development server after changing `.env.local`

2. **"Authorization failed"**
   - Check if the redirect URL matches exactly
   - Ensure the API key is correct

3. **"Token exchange failed"**
   - Verify API secret is correct
   - Check if the request token is valid

## Learn More

- [Zerodha Kite Connect Documentation](https://kite.trade/docs/connect/v3/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Deployment Guide](https://vercel.com/docs)
