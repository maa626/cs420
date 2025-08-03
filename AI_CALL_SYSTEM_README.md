# AI Call Answering System

This project implements an AI-powered call answering system using Twilio, Next.js, and LangGraph. The system can receive calls, process speech input, generate AI responses, and maintain conversational flow until the caller's requests are resolved.

## Features

- **Incoming Call Handling**: Automatically answers incoming calls with a custom greeting
- **Speech-to-Text**: Converts caller speech to text for AI processing
- **AI Conversation**: Uses LangGraph to manage conversation flow and generate responses
- **Text-to-Speech**: Converts AI responses back to speech for the caller
- **Call Management**: Tracks call sessions and handles call lifecycle events
- **Analytics**: Provides call analytics and system monitoring
- **Programmatic Call Initiation**: API endpoint to initiate calls programmatically

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Caller    │───▶│   Twilio    │───▶│   Next.js   │───▶│  LangGraph  │
│             │    │             │    │   API       │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                           │                   │                   │
                           ▼                   ▼                   ▼
                    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                    │ Speech-to-  │    │   OpenAI    │    │ Conversation│
                    │ Text        │    │   GPT-4     │    │   Flow      │
                    └─────────────┘    └─────────────┘    └─────────────┘
```

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# App Configuration
NEXT_PUBLIC_BASE_URL=https://your-domain.com
DATABASE_URL=your_database_url
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Twilio Setup

1. **Create a Twilio Account**: Sign up at [twilio.com](https://www.twilio.com)
2. **Get a Phone Number**: Purchase a phone number in your Twilio console
3. **Configure Webhooks**: Set the following webhook URLs in your Twilio phone number settings:
   - **Voice Webhook**: `https://your-domain.com/api/twilio`
   - **Status Callback**: `https://your-domain.com/api/twilio/status`

### 4. OpenAI Setup

1. **Create OpenAI Account**: Sign up at [openai.com](https://www.openai.com)
2. **Get API Key**: Generate an API key from your OpenAI dashboard
3. **Add to Environment**: Add the API key to your `.env.local` file

## API Endpoints

### 1. Main Webhook (`/api/twilio`)
- **Method**: POST
- **Purpose**: Handles incoming calls and generates initial greeting
- **Response**: TwiML XML

### 2. Speech Processing (`/api/twilio/process-speech`)
- **Method**: POST
- **Purpose**: Processes speech input and returns AI response
- **Response**: TwiML XML

### 3. Call Status (`/api/twilio/status`)
- **Method**: POST
- **Purpose**: Handles call status updates (completed, busy, etc.)
- **Response**: JSON

### 4. Initiate Call (`/api/twilio/initiate-call`)
- **Method**: POST
- **Purpose**: Programmatically initiate calls
- **Request Body**:
  ```json
  {
    "to": "+1234567890",
    "from": "+0987654321" // optional, defaults to TWILIO_PHONE_NUMBER
  }
  ```
- **Response**: JSON

### 5. Analytics (`/api/twilio/analytics`)
- **Method**: GET
- **Purpose**: Get call analytics and system status
- **Response**: JSON

## Usage

### Testing the System

1. **Start the Development Server**:
   ```bash
   npm run dev
   ```

2. **Access the Test Page**:
   Navigate to `http://localhost:3000/test-call`

3. **Initiate a Test Call**:
   - Enter a phone number in international format
   - Click "Start Call"
   - The AI will answer and begin the conversation

### Programmatic Usage

```javascript
// Initiate a call
const response = await fetch('/api/twilio/initiate-call', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: '+1234567890'
  }),
});

const result = await response.json();
console.log(result);
```

## Conversation Flow

1. **Call Initiation**: Caller dials the Twilio number
2. **Greeting**: AI greets the caller with a welcome message
3. **Speech Input**: Caller speaks their request
4. **Processing**: Speech is converted to text and sent to LangGraph
5. **AI Response**: LangGraph generates an appropriate response
6. **Speech Output**: AI response is converted to speech and played
7. **Loop**: Steps 3-6 repeat until the call ends
8. **Call End**: Call ends when caller says goodbye or hangs up

## LangGraph Implementation

The system uses LangGraph to manage conversation state and flow:

```typescript
// State structure
interface CallState {
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

// Graph nodes
- greeting: Initial greeting message
- process_input: Process user input and generate response
- end_call: Handle call termination
```

## Customization

### Modifying the AI Personality

Edit `src/lib/ai-call-graph.ts` to customize the AI's behavior:

```typescript
// Customize the greeting message
workflow.addNode('greeting', async (state: CallState) => {
  const greetingMessage = new AIMessage(
    "Hello! Welcome to [Your Company]. How can I help you today?"
  );
  // ...
});

// Customize the AI prompt
const response = await llm.invoke([
  new HumanMessage(`
    You are a helpful customer service representative for [Your Company].
    The customer said: "${lastMessage.content}"
    
    Provide helpful, professional responses. Keep responses concise.
    If they ask about [specific topics], provide [specific information].
  `)
]);
```

### Adding Custom Conversation Logic

Extend the LangGraph with additional nodes:

```typescript
// Add a new node for handling specific requests
workflow.addNode('handle_specific_request', async (state: CallState) => {
  // Custom logic for specific request types
  return {
    messages: [new AIMessage("Custom response")],
    currentStep: 'handle_specific_request',
    callSessionId: state.callSessionId,
    isComplete: false,
  };
});

// Add edge to connect to new node
workflow.addEdge('process_input', 'handle_specific_request');
```

## Security Considerations

1. **Webhook Validation**: Implement proper Twilio webhook signature validation
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **Authentication**: Add authentication for programmatic call initiation
4. **Logging**: Implement comprehensive logging for debugging and monitoring
5. **Error Handling**: Add robust error handling for all edge cases

## Monitoring and Analytics

The system provides several monitoring capabilities:

- **Call Analytics**: Track active calls and session information
- **Error Logging**: Comprehensive error logging for debugging
- **Performance Metrics**: Monitor response times and success rates
- **Call Quality**: Track speech recognition confidence scores

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Calls**:
   - Verify Twilio webhook URLs are correctly configured
   - Check that your domain is publicly accessible
   - Ensure HTTPS is enabled for production

2. **Speech Recognition Issues**:
   - Verify Twilio phone number supports speech recognition
   - Check audio quality and background noise
   - Implement fallback handling for low-confidence results

3. **AI Response Issues**:
   - Verify OpenAI API key is valid
   - Check API rate limits and quotas
   - Monitor response times and implement timeouts

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
```

This will provide detailed logs for troubleshooting.

## Production Deployment

1. **Deploy to Vercel/Netlify**: Use your preferred hosting platform
2. **Set Environment Variables**: Configure all required environment variables
3. **Update Webhook URLs**: Update Twilio webhook URLs to your production domain
4. **Enable HTTPS**: Ensure your domain has SSL certificates
5. **Monitor Performance**: Set up monitoring and alerting

## License

This project is licensed under the MIT License.

## Support

For support and questions, please refer to the project documentation or create an issue in the repository. 