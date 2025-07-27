import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../lib/authenticate';
import getSessionToken from '../../../lib/session-token';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ customer: string }> }
) {
    try {
        const sessionToken = getSessionToken(request);
        if (!sessionToken) {
            return new NextResponse('Session token is required', { status: 401 });
        }

        const session = await auth(sessionToken);
        if (!session) {
            return new NextResponse('Invalid session token', { status: 401 });
        }

        let { customer: customerEmail } = await params;
        customerEmail = decodeURIComponent(customerEmail);

        // Check if customer exists
        const customer = await prisma.customer.findUnique({
            where: { email: customerEmail }
        });

        if (!customer) {
            return new NextResponse('Customer not found', { status: 404 });
        }

        // Get all access requests for this customer
        const accessRequests = await prisma.clinicianAccessRequest.findMany({
            where: { customer_email: customerEmail },
            orderBy: { createdAt: 'desc' }
        });

        // Format the response
        const formattedRequests = accessRequests.map(request => ({
            clinicianUsername: request.clinician_username,
            customerEmail: request.customer_email,
            requestDate: request.createdAt.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            }),
            status: request.status
        }));

        return NextResponse.json(formattedRequests);
    } catch (error) {
        console.error('Failed to get clinician access requests:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 