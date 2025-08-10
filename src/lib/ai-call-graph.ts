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
  temperature: 0.7,
});

//Will be implementing the Agent with the tools

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

 
