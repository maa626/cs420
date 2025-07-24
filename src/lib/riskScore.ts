import { PrismaClient } from "@prisma/client";

export default async function saveRiskScore(email: string, score: number, riskDate: string) {
    const prisma = new PrismaClient();

    const customer = await prisma.customer.findUnique({
        where: {
            email: email,
        },
    });

    if (!customer) {
        return null;
    }

    let riskScore = await prisma.riskScore.findFirst({
        where: {
            customer_id: customer.id,
            risk_date: riskDate,
        },
    });

    if (!riskScore) {
        riskScore = await prisma.riskScore.create({
            data: {
                customer_id: customer.id,
                score: score,
                risk_date: riskDate,
                birth_year: customer.birth_date.getFullYear(),
            },
        });
    }

    return riskScore;
}