# Google Maps API Setup

This app uses the Google Maps Distance Matrix API to automatically calculate mileage between your home address and gig venues.

## Setup Instructions

### 1. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Distance Matrix API**
4. Go to **Credentials** and create an API key
5. **Important**: Restrict your API key:
   - For **Application restrictions**: Choose "HTTP referrers (web sites)"
   - Add your domains (e.g., `*.vercel.app/*`, `localhost:*`)
   - For **API restrictions**: Select "Restrict key" and choose only "Distance Matrix API"

### 2. Configure the API Key

#### For Local Development

The API key is already configured in `app.json` under `expo.extra.googleMapsApiKey`.

#### For Production (Vercel)

You need to set the `GOOGLE_MAPS_API_KEY` environment variable in Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `GOOGLE_MAPS_API_KEY`
   - **Value**: Your Google Maps API key
   - **Environments**: Production, Preview, Development

### 3. How It Works

- **Web**: Uses the serverless function at `/api/distance.ts` to proxy requests (avoids CORS issues)
- **Mobile**: Calls the Google Maps API directly using the key from `app.json`

### 4. Security Notes

- Never commit API keys to version control
- Always restrict API keys to specific domains and APIs
- Monitor your API usage in Google Cloud Console
- Consider setting up billing alerts

### 5. Troubleshooting

**Error: "Google Maps API not configured"**
- Make sure the API key is set in Vercel environment variables
- Redeploy after adding the environment variable

**Error: "API key is invalid or restricted"**
- Check that the Distance Matrix API is enabled
- Verify your API key restrictions allow your domain
- Make sure the key hasn't been revoked

**Error: "No route found between addresses"**
- Verify both addresses are valid and complete
- Try entering the addresses manually in Google Maps to confirm they're routable

## Cost Information

Google Maps Distance Matrix API pricing (as of 2024):
- $5 per 1,000 requests
- First $200/month is free (40,000 requests)

For typical usage (a few gigs per week), you'll likely stay within the free tier.
