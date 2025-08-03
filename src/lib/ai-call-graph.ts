import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { END, StateGraph } from 'langgraph';
import { ENV_VARS } from './env-vars';

// Define the state structure for our conversation
export interface CallState {
  messages: (HumanMessage | AIMessage)[];
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
  temperature: 0.7,
});

// Define the conversation flow
export function createCallGraph() {
  const workflow = new StateGraph<CallState>({
    channels: {
      messages: {
        reducer: (current: (HumanMessage | AIMessage)[], update: (HumanMessage | AIMessage)[]) => {
          return [...current, ...update];
        },
        default: () => [],
      },
    },
  });

  // Add nodes for different conversation stages
  workflow.addNode('greeting', async (state: CallState) => {
    const greetingMessage = new AIMessage(
      "Hello! Welcome to our AI assistant. I'm here to help you with your inquiries. How can I assist you today?"
    );
    
    return {
      messages: [greetingMessage],
      currentStep: 'greeting',
      callSessionId: state.callSessionId,
      isComplete: false,
    };
  });

  workflow.addNode('process_input', async (state: CallState) => {
    const lastMessage = state.messages[state.messages.length - 1];
    
    if (lastMessage instanceof HumanMessage) {
      const response = await llm.invoke([
        new HumanMessage(`
          You are a helpful AI assistant handling customer calls. 
          The customer said: "${lastMessage.content}"
          
          Please provide a helpful and natural response. Keep responses concise and conversational.
          If the customer seems to be asking for specific information or help, provide it clearly.
          If they're saying goodbye or seem to be ending the call, acknowledge that politely.
        `)
      ]);

      return {
        messages: [response],
        currentStep: 'process_input',
        callSessionId: state.callSessionId,
        isComplete: false,
      };
    }

    return state;
  });

  workflow.addNode('end_call', async (state: CallState) => {
    const endMessage = new AIMessage(
      "Thank you for calling! Have a great day and feel free to call back if you need any further assistance."
    );
    
    return {
      messages: [endMessage],
      currentStep: 'end_call',
      callSessionId: state.callSessionId,
      isComplete: true,
    };
  });

  // Define the edges
  workflow.addEdge('greeting', 'process_input');
  workflow.addEdge('process_input', 'process_input');
  workflow.addEdge('process_input', 'end_call');
  workflow.addEdge('end_call', END);

  // Set the entry point
  workflow.setEntryPoint('greeting');

  return workflow.compile();
}

// Helper function to determine if the call should end
export function shouldEndCall(state: CallState): boolean {
  const lastMessage = state.messages[state.messages.length - 1];
  
  if (lastMessage instanceof HumanMessage) {
    const content = lastMessage.content.toLowerCase();
    const endPhrases = ['goodbye', 'bye', 'thank you', 'thanks', 'end call', 'hang up', 'that\'s all'];
    
    return endPhrases.some(phrase => content.includes(phrase));
  }
  
  return false;
}

// Helper function to get the last AI response
export function getLastAIResponse(state: CallState): string {
  const aiMessages = state.messages.filter(msg => msg instanceof AIMessage);
  const lastAIMessage = aiMessages[aiMessages.length - 1];
  
  return lastAIMessage ? lastAIMessage.content : '';
} 