import prisma from '@/lib/prisma';
import getSessionToken from '@/lib/session-token';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '../../../lib/authenticate';

const EmailSchema = z.string().email('invalid email');

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ customer: string }> }
) {
    try {
        const sessionToken = getSessionToken(request);
        if (!sessionToken) {
            return NextResponse.json({ error: 'Session token is required' }, { status: 401 });
        }

        const session = await auth(sessionToken);
        if (!session) {
            return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
        }

        const { customer: customerEmail } = await params;
        const result = await EmailSchema.safeParseAsync(customerEmail);

        if (!result.success) {
            return NextResponse.json({ error: result.error.message }, { status: 422 });
        }

        const customer = await prisma.customer.findUnique({
            where: {
                email: result.data,
            }
        });
        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // Get the consent value from request body as plain text
        const consentValue = await request.text();
        if (consentValue !== 'true' && consentValue !== 'false') {
            return NextResponse.json({ error: 'Consent value must be "true" or "false"' }, { status: 422 });
        }

        await prisma.customer.update({
            where: {
                id: customer.id,
            },
            data: {
                consent: consentValue === 'true',
            },
        });

        // Return success message as plain text
        return new NextResponse('Consent updated successfully.', { 
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
            }
        });
    } catch (error) {
        console.error('Failed to update consent:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ customer: string }> }
) {
    try {
        const sessionToken = getSessionToken(request);
        if (!sessionToken) {
            return NextResponse.json({ error: 'Session token is required' }, { status: 401 });
        }

        const session = await auth(sessionToken);
        if (!session) {
            return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
        }

        const { customer: customerEmail } = await params;
        const result = await EmailSchema.safeParseAsync(customerEmail);

        if (!result.success) {
            return NextResponse.json({ error: result.error.message }, { status: 422 });
        }

        const customer = await prisma.customer.findUnique({
            where: {    
                email: result.data,
            },
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }
        // Return the consent value as plain text
        return new NextResponse(customer.consent.toString(), { 
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
            }
        });
    } catch (error) {
        console.error('Failed to get consent:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
