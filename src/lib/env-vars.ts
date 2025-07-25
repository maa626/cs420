import { loadEnvConfig } from '@next/env';
import { z } from 'zod';

loadEnvConfig(process.cwd());

const AppSchema = z.object({
    APP_ENV: z.enum(['production', 'local']).default('production'),
});

const DatabaseSchema = z.object({
    DATABASE_URL: z.string().url(),
});

const ExternalApiSchema = z.object({
    STEDI_API_URL: z.string().url().default('https://dev.stedi.me'),
});

// https://zod.dev/?id=inferring-the-inferred-type
function validateEnvWithSchema<TSchema extends z.ZodTypeAny>(schema: TSchema, schemaName: string): z.infer<TSchema> {
    const result = schema.safeParse(process.env);

    if (!result.success) {
        console.error(`(${schemaName}) There is an error with the environment variables\n`);
        console.error(result.error.format());
        process.exit(1);
    }

    return result.data;
}

export const ENV_VARS = {
    ...validateEnvWithSchema(AppSchema, 'AppSchema'),
    ...validateEnvWithSchema(DatabaseSchema, 'DatabaseSchema'),
    ...validateEnvWithSchema(ExternalApiSchema, 'ExternalApiSchema'),
};
