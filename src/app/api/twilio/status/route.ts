import { TwilioService } from '@/lib/twilio-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const callDuration = formData.get('CallDuration') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;

    const twilioService = TwilioService.getInstance();

    // Log the call status update
    twilioService.logCallActivity(callSid, 'Status update', { 
      callStatus, 
      callDuration: callDuration ? parseInt(callDuration) : 0,
      from,
      to
    });

    // If the call has ended, clean up the session
    if (callStatus === 'completed' || callStatus === 'busy' || callStatus === 'failed' || callStatus === 'no-answer') {
      twilioService.endCallSession(callSid);
      twilioService.logCallActivity(callSid, 'Call session ended', { reason: callStatus });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Call status updated',
      callSid,
      callStatus
    });

  } catch (error) {
    console.error('Error handling call status:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process call status' 
    }, { status: 500 });
  }
} 