import { z } from 'zod';

export interface JsonSchemaProperty {
    type: string;
    description?: string;
    [key: string]: unknown;
}

export interface JsonSchema {
    type: 'object';
    properties?: Record<string, JsonSchemaProperty>;
    required?: string[];
    [key: string]: unknown;
}

export class SchemaConverter {
    private static convertProperty(prop: JsonSchemaProperty): z.ZodType {
        switch (prop.type) {
            case 'string':
                return prop.description ? z.string().describe(prop.description) : z.string();
            case 'number':
                return z.number();
            case 'boolean':
                return z.boolean();
            default:
                return z.any();
        }
    }

    static toZod(schema: JsonSchema): z.ZodObject<any> {
        if (schema.type !== 'object') {
            throw new Error('Only object schemas are supported');
        }

        const shape: Record<string, z.ZodType> = {};

        if (schema.properties) {
            Object.entries(schema.properties).forEach(([key, prop]) => {
                shape[key] = this.convertProperty(prop);
            });
        }

        const zodSchema = z.object(shape);
        return schema.required?.length ? zodSchema.required() : zodSchema;
    }
} 