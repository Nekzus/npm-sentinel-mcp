import { z } from 'zod';

export interface JsonSchemaProperty {
	type: string;
	description?: string;
	items?: JsonSchemaProperty;
	[key: string]: unknown;
}

export interface JsonSchema {
	type: 'object';
	properties?: Record<string, JsonSchemaProperty>;
	required?: string[];
	[key: string]: unknown;
}

function convertProperty(prop: JsonSchemaProperty): z.ZodType {
	switch (prop.type) {
		case 'string':
			return z.string();
		case 'number':
			return z.number();
		case 'boolean':
			return z.boolean();
		case 'array':
			if (!prop.items) {
				throw new Error('Array schema must have items property');
			}
			return z.array(convertProperty(prop.items));
		case 'object':
			return z.record(z.string(), z.unknown());
		default:
			return z.unknown();
	}
}

export const schemaConverter = {
	toZod: (schema: JsonSchema): z.ZodObject<Record<string, z.ZodType>> => {
		if (schema.type !== 'object') {
			throw new Error('Only object schemas are supported');
		}

		const shape: Record<string, z.ZodType> = {};

		if (schema.properties) {
			for (const [key, prop] of Object.entries(schema.properties)) {
				shape[key] = convertProperty(prop);
			}
		}

		const zodSchema = z.object(shape);
		return schema.required?.length ? zodSchema.required() : zodSchema;
	},
};
