import { TwilioService } from '@/lib/twilio-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callStatus = formData.get('CallStatus') as string;

    const twilioService = TwilioService.getInstance();

    // Log the incoming call
    twilioService.logCallActivity(callSid, 'Incoming call', { from, to, callStatus });

    // Create a new call session
    twilioService.createCallSession(callSid, from, to);

    // Generate the initial greeting TwiML
    const twiml = twilioService.generateGreetingTwiML();

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('Error handling incoming call:', error);
    
    // Return error TwiML
    const errorTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I'm sorry, there was an error processing your call. Please try again later.</Say>
  <Hangup/>
</Response>`;

    return new NextResponse(errorTwiML, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

export async function GET() {
  // Handle GET requests (for testing)
  return NextResponse.json({ 
    message: 'Twilio webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
} 