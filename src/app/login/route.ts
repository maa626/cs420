import { ENV_VARS } from '@/lib/env-vars';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';


// Schema for login request
const LoginSchema = z.object({
    userName: z.string().email('invalid email'),
    password: z.string().min(1, 'required'),
});

export async function POST(request: NextRequest) {
    try {
        // Validate request body
        const body = await request.json();
        const result = await LoginSchema.safeParseAsync(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.errors[0].message }, { status: 422 });
        }

        // Forward request to STEDI API
        const response = await fetch(`${ENV_VARS.STEDI_API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(result.data),
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Get the session token from response
        const sessionToken = await response.text();

        // Return the session token as text
        return new NextResponse(sessionToken, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
            },
        });
    } catch (error) {
        console.error('Login failed:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
