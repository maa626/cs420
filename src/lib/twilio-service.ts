

export interface CallSession {
  callSid: string;
  sessionId: string;
  from: string;
  to: string;
  status: string;
  startTime: Date;
}

export class TwilioService {
  private static instance: TwilioService;
  private activeCalls: Map<string, CallSession> = new Map();

  static getInstance(): TwilioService {
    if (!TwilioService.instance) {
      TwilioService.instance = new TwilioService();
    }
    return TwilioService.instance;
  }

  // Create a new call session
  createCallSession(callSid: string, from: string, to: string): CallSession {
    const session: CallSession = {
      callSid,
      sessionId: `${callSid}_${Date.now()}`,
      from,
      to,
      status: 'active',
      startTime: new Date(),
    };

    this.activeCalls.set(callSid, session);
    return session;
  }

  // Get call session
  getCallSession(callSid: string): CallSession | undefined {
    return this.activeCalls.get(callSid);
  }

  // End call session
  endCallSession(callSid: string): void {
    this.activeCalls.delete(callSid);
  }

  // Generate TwiML for initial greeting
  generateGreetingTwiML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! Welcome to our AI assistant. I'm here to help you with your inquiries. How can I assist you today?</Say>
  <Gather input="speech" action="/api/twilio/process-speech" method="POST" speechTimeout="auto" language="en-US">
    <Say voice="alice">Please speak after the beep.</Say>
  </Gather>
</Response>`;
  }

  // Generate TwiML for AI response
  generateResponseTwiML(aiResponse: string, shouldEndCall: boolean = false): string {
    if (shouldEndCall) {
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${aiResponse}</Say>
  <Hangup/>
</Response>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${aiResponse}</Say>
  <Gather input="speech" action="/api/twilio/process-speech" method="POST" speechTimeout="auto" language="en-US">
    <Say voice="alice">Please speak after the beep.</Say>
  </Gather>
</Response>`;
  }

  // Generate TwiML for error handling
  generateErrorTwiML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I'm sorry, I didn't catch that. Could you please repeat your question?</Say>
  <Gather input="speech" action="/api/twilio/process-speech" method="POST" speechTimeout="auto" language="en-US">
    <Say voice="alice">Please speak after the beep.</Say>
  </Gather>
</Response>`;
  }

  // Validate Twilio webhook signature
  validateWebhookSignature(request: Request): boolean {
    const signature = request.headers.get('X-Twilio-Signature');
    
    if (!signature) return false;

    // In production, you should validate the signature properly
    // For now, we'll return true for development
    return true;
  }

  // Convert speech to text using Twilio's speech recognition
  async speechToText(): Promise<string> {
    try {
      // In a real implementation, you would use Twilio's Media API
      // or a third-party service like Google Speech-to-Text
      // For now, we'll return a placeholder
      return "Hello, I need help with my account.";
    } catch (error) {
      console.error('Error converting speech to text:', error);
      throw new Error('Failed to convert speech to text');
    }
  }

  // Log call activity
  logCallActivity(callSid: string, activity: string, data?: unknown): void {
    console.log(`Call ${callSid}: ${activity}`, data);
  }
} 