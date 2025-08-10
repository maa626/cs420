import { ChatOpenAI } from '@langchain/openai';
import { ENV_VARS } from './env-vars';

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
};

// Risk Score tool (stub; replace with your real logic/API)
async function riskScoreTool(input: string): Promise<string> {
  // TODO: replace with real risk score logic or API
  return `I can help with your risk score. Based on the information provided, your provisional risk score is medium. Would you like me to record more details to refine it?`;
}

// Rapid Step Test tool (stub; replace with your real logic/API)
async function rapidStepTestTool(input: string): Promise<string> {
  // TODO: replace with real rapid step test flow (instructions, data capture, results)
  return `For the rapid step test, please stand up and step in place for one minute. I’ll count and evaluate your cadence and stability. Say “ready” to begin.`;
}

// Helper: safe JSON extraction from model output
function extractJSON(text: string): any | null {
  try {
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// Supervisor: decide what to do with the user message
async function supervisor(userMessage: string): Promise<SupervisorDecision> {
  const sys = `
You are a call supervisor. Choose the best next action for a short, safe, phone conversation.
- If the user wants a risk score: route to "risk_score".
- If the user wants the rapid step test: route to "rapid_step_test".
- If it's small talk or general: respond yourself.
- If the user says goodbye or wants to end: action "end".
Return ONLY compact JSON like:
{"action":"route","target":"risk_score"}
or
{"action":"respond","response":"your brief reply"}
or
{"action":"end"}`.trim();

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
    const decision = await supervisor(userMessage);

    if (decision.action === 'end') {
      return { aiResponse: `Thanks for calling. Goodbye.`, shouldEnd: true };
    }

    if (decision.action === 'respond') {
      const reply = decision.response?.trim() || `Got it. How can I help you further?`;
      return { aiResponse: reply, shouldEnd: false };
    }

    // action === 'route'
    if (decision.target === 'risk_score') {
      const toolReply = await riskScoreTool(userMessage);
      return { aiResponse: toolReply, shouldEnd: false };
    }

    if (decision.target === 'rapid_step_test') {
      const toolReply = await rapidStepTestTool(userMessage);
      return { aiResponse: toolReply, shouldEnd: false };
    }

    // Unknown target fallback
    return {
      aiResponse: `I can help with your risk score or the rapid step test. Which would you like to do?`,
      shouldEnd: false,
    };
  } catch (e) {
    console.error('handleCallTurn error:', e);
    return {
      aiResponse: `I'm sorry, I had trouble with that. Would you like help with your risk score or the rapid step test?`,
      shouldEnd: false,
    };
  }
}

