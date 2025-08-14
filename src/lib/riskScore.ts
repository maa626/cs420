import { ENV_VARS } from './env-vars';
import prisma from './prisma';

export default async function saveRiskScore(email: string, score: number, riskDate: string) {
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

export async function fetchRiskScore(email: string, sessionToken: string) {
    // Forward request to STEDI API
    const response = await fetch(`${ENV_VARS.STEDI_API_URL}/riskscore/${encodeURIComponent(email)}`, {
        headers: {
            'accept': '*/*',
            'suresteps.session.token': sessionToken,
        }
    });

    if (!response.ok) {
        let errorMessage = 'Failed to get risk score';
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch {
            // If we can't parse the error response, use the default message
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
}