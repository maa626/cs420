import { handleCallTurn } from '@/lib/ai-call-graph';
import { TwilioService } from '@/lib/twilio-service';
import { NextRequest, NextResponse } from 'next/server';

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

    // Get or create the call session (resilient approach)
    const session = twilioService.getOrCreateCallSession(callSid);
    console.log('Session found/created for callSid:', callSid);
    console.log('Available sessions:', Array.from(twilioService['activeCalls'].keys()));

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

    // Use the multi-agent orchestrator with conversation history
    const { aiResponse, shouldEnd } = await handleCallTurn(callSid, speechResult);

    // Generate the appropriate TwiML response
    const twiml = twilioService.generateResponseTwiML(aiResponse, shouldEnd);

    // Log the conversation turn
    twilioService.logCallActivity(callSid, 'Conversation turn processed', { 
      userMessage: speechResult, 
      aiResponse, 
      shouldEnd,
      historyLength: twilioService.getConversationHistory(callSid).length
    });

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
  <Pause length="1"/>
  <Gather input="speech" action="/api/twilio/process-speech" method="POST" speechTimeout="3" language="en-US" timeout="10">
    <Say voice="alice">Please speak now.</Say>
  </Gather>
  <Say voice="alice">I didn't hear anything. Please call back when you're ready to speak.</Say>
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