import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const authCode = searchParams.get('request_token');
    const status = searchParams.get('status');
    const action = searchParams.get('action');

    // Check if the authorization was successful
    if (status !== 'success' || !authCode) {
      return NextResponse.redirect(
        new URL('/auth/error?error=authorization_failed', request.url)
      );
    }

    // Store the authorization code in session or redirect with it
    // In a real application, you would exchange this code for an access token
    console.log('Received authorization code:', authCode);
    console.log('Action:', action);

    // For now, redirect to dashboard with the auth code
    // In production, you should exchange this for an access token first
    const dashboardUrl = new URL('/dashboard', request.url);
    dashboardUrl.searchParams.set('auth_code', authCode);
    
    return NextResponse.redirect(dashboardUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?error=callback_error', request.url)
    );
  }
}

// Handle POST requests if needed
export async function POST(request) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
