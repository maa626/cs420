import { ENV_VARS } from '@/lib/env-vars';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '../../lib/authenticate';
import getSessionToken from '../../lib/session-token';
import createStep from '../../lib/steps';

const prisma = new PrismaClient();

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

        // Forward request to STEDI API
        const response = await fetch(`${ENV_VARS.STEDI_API_URL}/rapidsteptest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'suresteps.session.token': sessionToken,
            },
            body: JSON.stringify(result.data),
        });

        if (!response.ok) {
            let errorMessage = 'Failed to save step data';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch {
                // If we can't parse the error response, use the default message
            }
            return NextResponse.json({ error: errorMessage }, { status: response.status });
        }

        const step = await createStep({
            customer: result.data.customer,
            device_id: result.data.deviceId,
            started_at: new Date(result.data.startTime),
            ended_at: new Date(result.data.stopTime ?? result.data.startTime),
            points: result.data.stepPoints,
        });

        if (!step) {
            return NextResponse.json({ error: 'Failed to save step data' }, { status: 500 });
        }

        // Return "Saved" as text with 200 status code
        return new NextResponse('Saved', {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
            },
        });
    } catch (error) {
        console.error('Failed to save step data:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
