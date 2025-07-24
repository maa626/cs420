import prisma from './prisma';

type Step = {
    customer: string;
    device_id: string;
    started_at: Date;
    ended_at: Date;
    points: Array<number>;
}

export default async function createStep(step: Step) {
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