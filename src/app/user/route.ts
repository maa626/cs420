import { ENV_VARS } from '@/lib/env-vars';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for user creation request
const CreateUserSchema = z
    .object({
        userName: z.string().email('invalid email'),
        email: z.string().email('invalid email'),
        phone: z.string().min(1, 'required'),
        region: z.string().min(1, 'required'),
        birthDate: z.string().min(1, 'required'),
        password: z.string().min(8, 'password must be at least 8 characters'),
        verifyPassword: z.string().min(1, 'required'),
        agreedToTermsOfUseDate: z.number().min(1, 'required'),
        agreedToCookiePolicyDate: z.number().min(1, 'required'),
        agreedToPrivacyPolicyDate: z.number().min(1, 'required'),
        agreedToTextMessageDate: z.number().min(1, 'required'),
    })
    .refine((data) => data.password === data.verifyPassword, {
        message: "Passwords don't match",
        path: ['verifyPassword'],
    });

export async function POST(request: NextRequest) {
    try {
        // Validate request body
        const body = await request.json();
        const result = await CreateUserSchema.safeParseAsync(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.errors[0].message }, { status: 422 });
        }

        // Forward request to STEDI API
        const response = await fetch(`${ENV_VARS.STEDI_API_URL}/user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(result.data),
        });

        if (!response.ok) {
            let errorMessage = 'Failed to create user';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch {
                // If we can't parse the error response, use the default message
            }
            return NextResponse.json({ error: errorMessage }, { status: response.status });
        }

        // Return success with 200 status code
        return new NextResponse(null, { status: 200 });
    } catch (error) {
        console.error('Failed to create user:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}
