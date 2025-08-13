import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '../../lib/authenticate';
import { createRapidStepTest, StepTest } from '../../lib/rapidStepTEst';
import getSessionToken from '../../lib/session-token';

// Schema for step data
const StepDataSchema = z.object({
    customer: z.string().email('invalid email'),
    startTime: z.number().min(1, 'required'),
    stepPoints: z.array(z.number()).min(1, 'at least one step point is required'),
    stopTime: z.optional(z.number().min(1, 'required')),
    testTime: z.optional(z.number().min(1, 'required')),
    totalSteps: z.number().min(1, 'required'),
    deviceId: z.string().min(1, 'required'),
});

export async function POST(request: NextRequest) {
    try {
        const sessionToken = getSessionToken(request);
        if (!sessionToken) {
            return NextResponse.json({ error: 'Session token is required' }, { status: 401 });
        }

        const session = await auth(sessionToken);
        if (!session) {
            return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
        }

        // Validate request body
        const body = await request.json();
        const result = await StepDataSchema.safeParseAsync(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.errors[0].message }, { status: 422 });
        }

        return await createRapidStepTest(sessionToken, result.data as StepTest)
            .then(() => {
                return new NextResponse('Saved', {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/plain',
                    },
                });
            })
            .catch((error) => {
                return NextResponse.json({ error: error.message }, { status: error.status });
            });
    } catch (error) {
        console.error('Failed to save step data:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
