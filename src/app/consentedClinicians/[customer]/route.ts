import getSessionToken from '@/lib/session-token';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '../../../lib/authenticate';
import saveConsentedClinician from '../../../lib/consentedClinician';

const prisma = new PrismaClient();

const EmailSchema = z.string().email('invalid email');

// PATCH: Add a consented clinician
export async function PATCH(request: NextRequest, { params }: { params: { customer: string } }) {
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

    // Get clinician email from plain text body
    const clinicianEmail = (await request.text()).trim();
    if (!clinicianEmail || !/^\S+@\S+\.\S+$/.test(clinicianEmail)) {
      return NextResponse.json({ error: 'Valid clinician email required' }, { status: 422 });
    }

    const consentedClinician = await saveConsentedClinician(customerEmail, clinicianEmail);
    if (!consentedClinician) {
      return NextResponse.json({ error: 'Failed to save consented clinician' }, { status: 500 });
    }

    return new NextResponse('Clinician consent updated successfully.', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('Failed to update consented clinician:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// GET: List all consented clinicians for a customer
export async function GET(request: NextRequest, { params }: { params: { customer: string } }) {
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
      where: { email: result.data },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const clinicians = await prisma.consentedClinician.findMany({
      where: { customer_id: customer.id },
      select: { email: true, expire_at: true },
    });

    const cliniciansResult = clinicians.map((c: { email: string; expire_at: Date }) => ({
      clinicianUsername: c.email,
      consentExpirationDate: c.expire_at.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }),
    }));

    return NextResponse.json(cliniciansResult);
  } catch (error) {
    console.error('Failed to get consented clinicians:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
