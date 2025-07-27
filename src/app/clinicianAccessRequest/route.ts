import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '../../lib/authenticate';
import getSessionToken from '../../lib/session-token';

// Schema for clinician access request
const ClinicianAccessRequestSchema = z.object({
    clinicianUsername: z.string().email('Invalid clinician email'),
    customerEmail: z.string().email('Invalid customer email'),
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
        const result = await ClinicianAccessRequestSchema.safeParseAsync(body);
        
        if (!result.success) {
            return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
        }

        // Check if customer exists
        const customer = await prisma.customer.findUnique({
            where: { email: result.data.customerEmail }
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // Check if access request already exists
        const existingRequest = await prisma.clinicianAccessRequest.findFirst({
            where: {
                clinician_username: result.data.clinicianUsername,
                customer_email: result.data.customerEmail,
                status: 'pending'
            }
        });

        if (existingRequest) {
            return new NextResponse('Access request already exists', { status: 409 });
        }

        // Create the access request
        await prisma.clinicianAccessRequest.create({
            data: {
                clinician_username: result.data.clinicianUsername,
                customer_email: result.data.customerEmail,
            }
        });

        // Return success with 201 status code
        return new NextResponse("Access request submitted successfully.", { status: 201 });
    } catch (error) {
        console.error('Failed to create clinician access request:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 

export async function DELETE(request: NextRequest) {
    try {
        const sessionToken = getSessionToken(request);
        if (!sessionToken) {
            return new NextResponse('Session token is required', { status: 401 });
        }

        const session = await auth(sessionToken);
        if (!session) {
            return new NextResponse('Invalid session token', { status: 401 });
        }

        // Validate request body
        const body = await request.json();
        const result = await ClinicianAccessRequestSchema.safeParseAsync(body);
        
        if (!result.success) {
            return new NextResponse(result.error.errors[0].message, { status: 400 });
        }

        // Check if customer exists
        const customer = await prisma.customer.findUnique({
            where: { email: result.data.customerEmail }
        });

        if (!customer) {
            return new NextResponse('Customer not found', { status: 404 });
        }

        // Find and delete the access request
        const deletedRequest = await prisma.clinicianAccessRequest.deleteMany({
            where: {
                clinician_username: result.data.clinicianUsername,
                customer_email: result.data.customerEmail,
                status: 'pending'
            }
        });

        if (deletedRequest.count === 0) {
            return new NextResponse('Access request not found', { status: 404 });
        }

        // Return success with 200 status code
        return new NextResponse("Access request deleted successfully.", { status: 200 });
    } catch (error) {
        console.error('Failed to delete clinician access request:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 