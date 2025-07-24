import { ENV_VARS } from '@/lib/env-vars';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '../../lib/authenticate';
import getSessionToken from '../../lib/session-token';

// Schema for customer creation request
const CreateCustomerSchema = z.object({
    customerName: z.string().min(1, 'required'),
    email: z.string().email('invalid email'),
    region: z.string().min(1, 'required'),
    phone: z.string().min(1, 'required'),
    whatsAppPhone: z.string().min(1, 'required'),
    birthDay: z.string().min(1, 'required'),
    gender: z.string().default('Male'),
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
        const result = await CreateCustomerSchema.safeParseAsync(body);
        
        if (!result.success) {
            return NextResponse.json({ error: result.error.errors[0].message }, { status: 422 });
        }

        // Forward request to STEDI API
        const response = await fetch(`${ENV_VARS.STEDI_API_URL}/customer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'suresteps.session.token': sessionToken,
            },
            body: JSON.stringify(result.data),
        });

        if (!response.ok) {
            let errorMessage = 'Failed to create customer';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch {
                // If we can't parse the error response, use the default message
            }
            return NextResponse.json({ error: errorMessage }, { status: response.status });
        }

        await prisma.customer.create({
            data: {
                user_id: session.user_id,
                name: result.data.customerName,
                email: result.data.email,
                region: result.data.region,
                phone: result.data.phone,
                whatsapp_phone: result.data.whatsAppPhone,
                birth_date: new Date(result.data.birthDay),
                gender: result.data.gender,
            },
        });

        // Return success with 200 status code
        return new NextResponse(null, { status: 200 });
    } catch (error) {
        console.error('Failed to create customer:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
