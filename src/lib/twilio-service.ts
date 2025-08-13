export interface CallSession {
  callSid: string;
  sessionId: string;
  from: string;
  to: string;
  status: string;
  startTime: Date;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  currentStep?: string;
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  testState?: {
    isActive: boolean;
    startTime?: Date;
    testType?: 'rapid_step_test' | 'risk_score';
  };
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
      conversationHistory: [],
    };

    this.activeCalls.set(callSid, session);
    return session;
  }

  // Get call session
  getCallSession(callSid: string): CallSession | undefined {
    return this.activeCalls.get(callSid);
  }

  // Add message to conversation history
  addMessageToHistory(callSid: string, role: 'user' | 'assistant', content: string): void {
    const session = this.activeCalls.get(callSid);
    if (session) {
      session.conversationHistory.push({
        role,
        content,
        timestamp: new Date(),
      });
    }
  }

  // Get conversation history for a call
  getConversationHistory(callSid: string): Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }> {
    const session = this.activeCalls.get(callSid);
    return session?.conversationHistory || [];
  }

  // Update current step in session
  updateCurrentStep(callSid: string, step: string): void {
    const session = this.activeCalls.get(callSid);
    if (session) {
      session.currentStep = step;
    }
  }

  // Update customer info in session
  updateCustomerInfo(callSid: string, info: { name?: string; phone?: string; email?: string }): void {
    const session = this.activeCalls.get(callSid);
    if (session) {
      session.customerInfo = { ...session.customerInfo, ...info };
    }
  }

  // Start a test
  startTest(callSid: string, testType: 'rapid_step_test' | 'risk_score'): void {
    const session = this.activeCalls.get(callSid);
    if (session) {
      session.testState = {
        isActive: true,
        startTime: new Date(),
        testType,
      };
    }
  }

  // Complete a test
  completeTest(callSid: string): void {
    const session = this.activeCalls.get(callSid);
    if (session) {
      session.testState = {
        isActive: false,
        startTime: session.testState?.startTime,
        testType: session.testState?.testType,
      };
    }
  }

  // Get test state
  getTestState(callSid: string): { isActive: boolean; startTime?: Date; testType?: string } | null {
    const session = this.activeCalls.get(callSid);
    return session?.testState || null;
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
  <Pause length="1"/>
  <Say voice="alice">Beep.</Say>
  <Gather input="speech" action="/api/twilio/process-speech" method="POST" speechTimeout="3" language="en-US" timeout="10">
    <Say voice="alice">Please speak now.</Say>
  </Gather>
  <Say voice="alice">I didn't hear anything. Please call back when you're ready to speak.</Say>
  <Hangup/>
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
  <Pause length="1"/>
  <Say voice="alice">Beep.</Say>
  <Gather input="speech" action="/api/twilio/process-speech" method="POST" speechTimeout="3" language="en-US" timeout="10">
    <Say voice="alice">Please speak now.</Say>
  </Gather>
  <Say voice="alice">I didn't hear anything. Please call back when you're ready to speak.</Say>
  <Hangup/>
</Response>`;
  }

  // Generate TwiML for error handling
  generateErrorTwiML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I'm sorry, I didn't catch that. Could you please repeat your question?</Say>
  <Pause length="1"/>
  <Say voice="alice">Beep.</Say>
  <Gather input="speech" action="/api/twilio/process-speech" method="POST" speechTimeout="3" language="en-US" timeout="10">
    <Say voice="alice">Please speak now.</Say>
  </Gather>
  <Say voice="alice">I didn't hear anything. Please call back when you're ready to speak.</Say>
  <Hangup/>
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

  // Get current conversation state for debugging
  getConversationState(callSid: string): {
    history: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>;
    currentStep?: string;
    customerInfo?: { name?: string; phone?: string; email?: string };
  } | null {
    const session = this.activeCalls.get(callSid);
    if (!session) return null;
    
    return {
      history: session.conversationHistory,
      currentStep: session.currentStep,
      customerInfo: session.customerInfo,
    };
  }
} 