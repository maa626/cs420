import prisma from "./prisma";

export async function authenticate(email: string, password: string, sessionToken: string) {
    const user = await prisma.user.findUnique({
        where: {
            email,
            password,
        },
    });

    if (!user) {
        return null;
    }

    await prisma.session.create({
        data: {
            user_id: user.id,
            token: sessionToken,
        },
    });

    return user;
}

export async function auth(sessionToken: string) {
    const session = await prisma.session.findUnique({
        where: {
            token: sessionToken,
        },
    });

    if (!session) {
        return null;
    }

    return session;
}
