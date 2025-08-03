import { ENV_VARS } from '@/lib/env-vars';
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const client = twilio(ENV_VARS.TWILIO_ACCOUNT_SID, ENV_VARS.TWILIO_AUTH_TOKEN);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, from = ENV_VARS.TWILIO_PHONE_NUMBER } = body;

    if (!to) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phone number is required' 
      }, { status: 400 });
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(to.replace(/\s/g, ''))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid phone number format' 
      }, { status: 400 });
    }

    // Make the call using Twilio
    const call = await client.calls.create({
      to,
      from,
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/twilio`,
      method: 'POST',
      statusCallback: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/twilio/status`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['completed', 'busy', 'failed', 'no-answer'],
    });

    return NextResponse.json({
      success: true,
      message: 'Call initiated successfully',
      callSid: call.sid,
      status: call.status,
      to,
      from
    });

  } catch (error) {
    console.error('Error initiating call:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to initiate call' 
    }, { status: 500 });
  }
} 