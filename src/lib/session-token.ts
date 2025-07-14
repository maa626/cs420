import { NextRequest } from "next/server";

export default function getSessionToken(request: NextRequest): string | null {
    const sessionToken = request.headers.get('suresteps-session-token');
    if (!sessionToken) {
        return null;
    }

    return sessionToken;
}