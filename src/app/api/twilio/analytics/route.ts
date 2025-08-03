import { TwilioService } from '@/lib/twilio-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const twilioService = TwilioService.getInstance();
    
    // Get active calls (this would need to be implemented in TwilioService)
    const activeCalls = Array.from(twilioService['activeCalls'].values());
    
    return NextResponse.json({
      success: true,
      data: {
        activeCalls: activeCalls.length,
        totalSessions: activeCalls.length, // In a real app, you'd track total sessions
        timestamp: new Date().toISOString(),
        calls: activeCalls.map(call => ({
          callSid: call.callSid,
          from: call.from,
          to: call.to,
          status: call.status,
          startTime: call.startTime,
          duration: Date.now() - call.startTime.getTime()
        }))
      }
    });

  } catch (error) {
    console.error('Error getting analytics:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get analytics' 
    }, { status: 500 });
  }
} 