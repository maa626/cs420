import { ENV_VARS } from '@/lib/env-vars';
import prisma from './prisma';

export interface StepTest {
    customer: string;
    startTime: number;
    stopTime: number;
    testTime: number;
    stepPoints: number[];
    totalSteps: number;
    deviceId: string;
}

type Step = {
    customer: string;
    device_id: string;
    started_at: Date;
    ended_at: Date;
    points: Array<number>;
}

const createRapidStepTest = async (sessionToken: string, stepTest: StepTest) => {
    // Forward request to STEDI API
    const response = await fetch(`${ENV_VARS.STEDI_API_URL}/rapidsteptest`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'suresteps.session.token': sessionToken,
        },
        body: JSON.stringify(stepTest),
    });

    if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to save step data';
        throw {
            message: errorMessage,
            status: response.status,
        };
    }

    const step = await createStep({
        customer: stepTest.customer,
        device_id: stepTest.deviceId,
        started_at: new Date(stepTest.startTime),
        ended_at: new Date(stepTest.stopTime ?? stepTest.startTime),
        points: stepTest.stepPoints,
    });

    if (!step) {
        throw {
            message: 'Failed to save step data',
            status: 500,
        };
    }

    return step;
}

const createStep = async (step: Step) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: {
                email: step.customer,
            },
        });
    
        if (!customer) {
            throw new Error('Customer not found');
        }
    
        let device = await prisma.device.findFirst({
            where: {
                customer_id: customer.id,
                name: step.device_id,
            },
        });
    
        if (!device) {
            await prisma.device.create({
                data: {
                    customer_id: customer.id,
                    name: step.device_id,
                },
            });
            
            device = await prisma.device.findFirst({
                where: {
                    customer_id: customer.id,
                    name: step.device_id,
                },
            });
        }
    
        await prisma.assessment.create({
            data: {
                customer_id: customer.id,
                deviceId: device?.id ?? 0,
                started_at: step.started_at,
                ended_at: step.ended_at,
                points: step.points,
            },
        });

        return step;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export {
    createRapidStepTest,
    createStep
};
