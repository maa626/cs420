import { ChatOpenAI } from '@langchain/openai';
import { ENV_VARS } from './env-vars';
import { createRapidStepTest, StepTest } from './rapidStepTest';
import { fetchRiskScore } from './riskScore';
import { TwilioService } from './twilio-service';

// Define the state structure for our conversation
export interface CallState {
  messages: string[];
  currentStep: string;
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  callSessionId: string;
  isComplete: boolean;
}

// Initialize the LLM
const llm = new ChatOpenAI({
  openAIApiKey: ENV_VARS.OPENAI_API_KEY,
  modelName: 'gpt-4o-mini',
  temperature: 0.3,
});

// Simple function to process user input and generate AI response
export async function processUserInput(userMessage: string): Promise<string> {
  try {
    const response = await llm.invoke([
      {
        role: 'user',
        content: `
          You are a helpful AI assistant handling customer calls. 
          The customer said: "${userMessage}"
          
          Please provide a helpful and natural response. Keep responses concise and conversational.
          If the customer seems to be asking for specific information or help, provide it clearly.
          If they're saying goodbye or seem to be ending the call, acknowledge that politely.
        `
      }
    ]);

    return response.content as string;
  } catch (error) {
    console.error('Error processing user input:', error);
    return "I'm sorry, I'm having trouble processing your request right now. Could you please try again?";
  }
}

// === Multi-agent scaffolding ===

// Decision returned by the supervisor
type SupervisorDecision = {
  action: 'respond' | 'route' | 'end';
  // When action === 'route'
  target?: 'risk_score' | 'rapid_step_test';
  // Optional suggested reply when action === 'respond'
  response?: string;
  // Optional step update
  step?: string;
};

// Risk Score tool using STEDI API
async function riskScoreTool(input: string, conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>): Promise<string> {
  // Check if we're in the middle of a risk assessment
  const recentMessages = conversationHistory.slice(-4);
  const hasAskedForRiskScore = recentMessages.some(msg => 
    msg.role === 'user' && 
    (msg.content.toLowerCase().includes('risk') || msg.content.toLowerCase().includes('score'))
  );

  if (hasAskedForRiskScore) {
    return `I'd be happy to help assess your risk score. To get started, could you tell me your age and if you have any existing health conditions?`;
  }

  try {
    // Use fake customer email and session token to fetch risk score from STEDI
    const fakeEmail = 'test.customer@example.com';
    const fakeSessionToken = '96d0fd2c-0451-4191-bc90-042fb5073c02';
    
    const riskScoreData = await fetchRiskScore(fakeEmail, fakeSessionToken);
    
    // Extract the risk score from the response
    const score = riskScoreData.score || riskScoreData.riskScore || 'medium';
    const riskLevel = riskScoreData.riskLevel || 'medium';
    
    return `Thank you for that information. I've calculated your risk score based on what you've shared. Your current risk score is ${score} (${riskLevel} risk level). Would you like me to ask a few more questions to refine this assessment or help you with anything else?`;
  } catch (error) {
    console.error('Error fetching risk score from STEDI:', error);
    return `Thank you for that information. I'm calculating your risk score based on what you've shared. Your provisional risk score appears to be medium. Would you like me to ask a few more questions to refine this assessment?`;
  }
}

// Rapid Step Test tool (stub; replace with your real logic/API)
async function rapidStepTestTool(
  input: string, 
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>,
  callSid: string
): Promise<string> {
  const twilioService = TwilioService.getInstance();
  
  // Check if user said "ready" to begin the test
  const userSaidReady = input.toLowerCase().includes('ready');
  
  // Check if we're already in the middle of a step test
  const recentMessages = conversationHistory.slice(-4);
  const hasStartedTest = recentMessages.some(msg => 
    msg.role === 'assistant' && 
    msg.content.toLowerCase().includes('step in place')
  );

  // Check if test is already completed
  const testCompleted = recentMessages.some(msg => 
    msg.role === 'assistant' && 
    msg.content.toLowerCase().includes('test completed')
  );

  if (testCompleted) {
    return `Great! Your rapid step test has been completed and saved. Is there anything else you'd like to do today?`;
  }

  // Check if we should complete the test (after 3 seconds from start)
  const testState = twilioService.getTestState(callSid);
  if (testState?.isActive && testState.startTime) {
    const timeSinceStart = Date.now() - testState.startTime.getTime();
    if (timeSinceStart >= 3000) { // 3 seconds have passed
      try {
        // Generate fake test data
        const startTime = testState.startTime.getTime();
        const stopTime = Date.now();
        const testTime = stopTime - startTime;
        
        // Generate fake step points (simulating 60 seconds of data at 10Hz)
        const stepPoints: number[] = [];
        for (let i = 0; i < 60; i++) {
          // Simulate realistic step data with some variation
          const baseStep = Math.random() > 0.3 ? 1 : 0; // 70% chance of a step
          stepPoints.push(baseStep);
        }

        const fakeStepTest: StepTest = {
          customer: 'test_user@example.com', // You'll need to get this from the call session
          startTime,
          stopTime,
          testTime,
          stepPoints,
          totalSteps: stepPoints.filter(p => p === 1).length,
          deviceId: 'twilio-voice-' + callSid,
        };

        // Call the createRapidStepTest function
        // Note: You'll need to provide a session token - for now using a placeholder
        const sessionToken = '96d0fd2c-0451-4191-bc90-042fb5073c02'; // TODO: Get real session token
        await createRapidStepTest(sessionToken, fakeStepTest);
        
        // Mark test as completed
        twilioService.completeTest(callSid);
        
        console.log(`Fake rapid step test completed for call ${callSid}`);
        return `Excellent! Your rapid step test has been completed and all data has been recorded. You took ${fakeStepTest.totalSteps} steps during the test. Is there anything else you'd like to do today?`;
      } catch (error) {
        console.error('Error completing fake rapid step test:', error);
        twilioService.completeTest(callSid);
        return `I encountered an issue saving your test data, but the test itself went well. Would you like to try again or do something else?`;
      }
    }
  }

  if (userSaidReady && hasStartedTest) {
    // Start the test
    twilioService.startTest(callSid, 'rapid_step_test');
    return `Perfect! I'm starting the timer now. I'll count your steps and assess your stability. Begin stepping now. The test will complete in about 3 seconds.`;
  }

  return `For the rapid step test, please stand up and step in place for one minute. I'll count and evaluate your cadence and stability. Say "ready" to begin.`;
}

// Helper: safe JSON extraction from model output
function extractJSON(text: string): SupervisorDecision | null {
  try {
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned) as SupervisorDecision;
  } catch {
    return null;
  }
}

// Supervisor: decide what to do with the user message
async function supervisor(
  userMessage: string, 
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>,
  currentStep?: string
): Promise<SupervisorDecision> {
  
  // Build conversation context
  const conversationContext = conversationHistory
    .slice(-6) // Keep last 6 messages for context
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  const sys = `
You are a call supervisor managing a conversation with context awareness. Choose the best next action based on the conversation history.

Current conversation context:
${conversationContext}

Current step: ${currentStep || 'initial'}

User's latest message: "${userMessage}"

Guidelines:
- If the user wants a risk score: route to "risk_score"
- If the user wants the rapid step test: route to "rapid_step_test"
- If it's small talk or general conversation: respond yourself
- If the user says goodbye or wants to end: action "end"
- If the user is answering a previous question, provide appropriate follow-up
- Consider the conversation flow and provide contextual responses

Return ONLY compact JSON like:
{"action":"route","target":"risk_score","step":"risk_assessment"}
or
{"action":"respond","response":"your brief reply","step":"general_conversation"}
or
{"action":"end"}`.trim();

  console.log('sys', sys);
  console.log('userMessage', userMessage);

  const res = await llm.invoke([
    { role: 'system', content: sys },
    { role: 'user', content: `User: ${userMessage}` },
  ]);

  const decision = extractJSON(String(res.content)) as SupervisorDecision | null;

  if (!decision) {
    // Fallback: respond
    return {
      action: 'respond',
      response: `Thanks for sharing. Would you like help with your risk score or the rapid step test?`,
      step: 'general_conversation',
    };
  }
  return decision;
}

// Orchestrator entry: returns aiResponse + shouldEnd for Twilio
export async function handleCallTurn(
  callSid: string,
  userMessage: string
): Promise<{ aiResponse: string; shouldEnd: boolean }> {
  try {
    const twilioService = TwilioService.getInstance();
    
    // Get conversation history and current session
    const conversationHistory = twilioService.getConversationHistory(callSid);
    const session = twilioService.getCallSession(callSid);
    const currentStep = session?.currentStep;

    // Add user message to history
    twilioService.addMessageToHistory(callSid, 'user', userMessage);

    const decision = await supervisor(userMessage, conversationHistory, currentStep);

    // Update current step if provided
    if (decision.step) {
      twilioService.updateCurrentStep(callSid, decision.step);
    }

    if (decision.action === 'end') {
      const response = `Thanks for calling. Goodbye.`;
      twilioService.addMessageToHistory(callSid, 'assistant', response);
      return { aiResponse: response, shouldEnd: true };
    }

    if (decision.action === 'respond') {
      const reply = decision.response?.trim() || `Got it. How can I help you further?`;
      twilioService.addMessageToHistory(callSid, 'assistant', reply);
      return { aiResponse: reply, shouldEnd: false };
    }

    // action === 'route'
    if (decision.target === 'risk_score') {
      const toolReply = await riskScoreTool(userMessage, conversationHistory);
      twilioService.addMessageToHistory(callSid, 'assistant', toolReply);
      return { aiResponse: toolReply, shouldEnd: false };
    }

    if (decision.target === 'rapid_step_test') {
      const toolReply = await rapidStepTestTool(userMessage, conversationHistory, callSid);
      twilioService.addMessageToHistory(callSid, 'assistant', toolReply);
      return { aiResponse: toolReply, shouldEnd: false };
    }

    // Unknown target fallback
    const fallbackResponse = `I can help with your risk score or the rapid step test. Which would you like to do?`;
    twilioService.addMessageToHistory(callSid, 'assistant', fallbackResponse);
    return {
      aiResponse: fallbackResponse,
      shouldEnd: false,
    };
  } catch (e) {
    console.error('handleCallTurn error:', e);
    const errorResponse = `I'm sorry, I had trouble with that. Would you like help with your risk score or the rapid step test?`;
    const twilioService = TwilioService.getInstance();
    twilioService.addMessageToHistory(callSid, 'assistant', errorResponse);
    return {
      aiResponse: errorResponse,
      shouldEnd: false,
    };
  }
}

