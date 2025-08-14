import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '../../../lib/authenticate';
import saveRiskScore, { fetchRiskScoreFromSTEDI as fetchRiskScore } from '../../../lib/riskScore';
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

        // Fetch risk score from STEDI API using library function
        const data = await fetchRiskScore(email, sessionToken);
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
