import { ENV_VARS } from '@/lib/env-vars';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '../../../lib/authenticate';
import saveRiskScore from '../../../lib/riskScore';
import getSessionToken from '../../../lib/session-token';

// Schema for email parameter
const EmailSchema = z.string().email('invalid email');

type RouteParams = {
    email: string;
};

type PageProps = {
    params: Promise<RouteParams>;
};

export async function GET(request: NextRequest, { params }: PageProps) {
    try {
        const sessionToken = getSessionToken(request);
        if (!sessionToken) {
            return NextResponse.json({ error: 'Session token is required' }, { status: 401 });
        }

        const session = await auth(sessionToken);
        if (!session) {
            return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
        }

        // Get and validate email parameter
        const { email } = await params;
        const result = await EmailSchema.safeParseAsync(email);
        if (!result.success) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        // Forward request to STEDI API
        const response = await fetch(`${ENV_VARS.STEDI_API_URL}/riskscore/${encodeURIComponent(email)}`, {
            headers: {
                'accept': '*/*',
                'suresteps.session.token': sessionToken,
            }
        });

        if (!response.ok) {
            let errorMessage = 'Failed to get risk score';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch {
                // If we can't parse the error response, use the default message
            }
            return NextResponse.json({ error: errorMessage }, { status: response.status });
        }

        const data = await response.json();
        const riskScore = await saveRiskScore(email, data.score, data.riskDate);

        if (!riskScore) {
            return NextResponse.json({ error: 'Failed to save risk score' }, { status: 500 });
        }

        // Get the risk score from response and return it
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to get risk score:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
