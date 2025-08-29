import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { request_token } = await request.json();

    if (!request_token) {
      return NextResponse.json(
        { error: 'Request token is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ZERODHA_API_KEY;
    const apiSecret = process.env.ZERODHA_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'API credentials not configured' },
        { status: 500 }
      );
    }

    // Generate checksum for Zerodha API
    const checksum = crypto
      .createHash('sha256')
      .update(apiKey + request_token + apiSecret)
      .digest('hex');

    // Exchange request token for access token
    const tokenResponse = await fetch('https://api.kite.trade/session/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Kite-Version': '3',
      },
      body: new URLSearchParams({
        api_key: apiKey,
        request_token: request_token,
        checksum: checksum,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.json(
        { error: 'Token exchange failed', details: tokenData },
        { status: 400 }
      );
    }

    // Return the access token and user details
    return NextResponse.json({
      access_token: tokenData.data.access_token,
      user_id: tokenData.data.user_id,
      user_name: tokenData.data.user_name,
      user_shortname: tokenData.data.user_shortname,
      email: tokenData.data.email,
      user_type: tokenData.data.user_type,
      broker: tokenData.data.broker,
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
