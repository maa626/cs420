import { TwilioService } from '@/lib/twilio-service';
import { NextRequest, NextResponse } from 'next/server';
import { handleCallTurn } from '@/lib/ai-call-graph';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const speechResult = formData.get('SpeechResult') as string;
    const confidence = formData.get('Confidence') as string;

    const twilioService = TwilioService.getInstance();

    // Log the speech input
    twilioService.logCallActivity(callSid, 'Speech received', { 
      speechResult, 
      confidence: parseFloat(confidence) 
    });

    // Get the call session
    const session = twilioService.getCallSession(callSid);
    if (!session) {
      throw new Error('Call session not found');
    }

    // If no speech was detected, ask the user to repeat
    if (!speechResult || speechResult.trim() === '') {
      const errorTwiML = twilioService.generateErrorTwiML();
      return new NextResponse(errorTwiML, {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      });
    }

    // Use the multi-agent orchestrator
    const { aiResponse, shouldEnd } = await handleCallTurn(callSid, speechResult);

    // Generate the appropriate TwiML response
    const twiml = twilioService.generateResponseTwiML(aiResponse, shouldEnd);

    // If the call is ending, clean up the session
    if (shouldEnd) {
      twilioService.endCallSession(callSid);
      twilioService.logCallActivity(callSid, 'Call ended', { reason: 'User requested end or supervisor end' });
    }

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });

  } catch (error) {
    console.error('Error processing speech:', error);
    
    // Return error TwiML
    const errorTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I'm sorry, there was an error processing your request. Please try again.</Say>
  <Gather input="speech" action="/api/twilio/process-speech" method="POST" speechTimeout="auto" language="en-US">
    <Say voice="alice">Please speak after the beep.</Say>
  </Gather>
</Response>`;

    return new NextResponse(errorTwiML, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}