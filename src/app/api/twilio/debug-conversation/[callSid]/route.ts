import { TwilioService } from '@/lib/twilio-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { callSid: string } }
) {
  try {
    const { callSid } = params;
    const twilioService = TwilioService.getInstance();
    
    const conversationState = twilioService.getConversationState(callSid);
    
    if (!conversationState) {
      return NextResponse.json(
        { error: 'Call session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      callSid,
      conversationState,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting conversation state:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
