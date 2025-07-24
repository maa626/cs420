import prisma from './prisma';

export default async function saveConsentedClinician(customerEmail: string, email: string) {
    const customer = await prisma.customer.findUnique({
        where: {
            email: customerEmail,
        },
    });

    if (!customer) {
        return null;
    }

    const expireAt = new Date();
    expireAt.setFullYear(expireAt.getFullYear() + 1);
    expireAt.setHours(0, 0, 0, 0);

    const consentedClinician = await prisma.consentedClinician.upsert({
        where: {
            customer_id: customer.id,
            email,
        },
        update: {
            expire_at: expireAt,
        },
        create: {
            customer_id: customer.id,
            email,
            expire_at: expireAt,
        },
    });

    return consentedClinician;
}