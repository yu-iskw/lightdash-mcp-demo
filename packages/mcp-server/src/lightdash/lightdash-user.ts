import { z } from 'zod';

const lightdashUserSchema = z.object({
  userUuid: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  organizationUuid: z.string(),
  organizationName: z.string(),
  role: z.string(),
  isActive: z.boolean(),
  impersonation: z.unknown().nullable(),
});

export const apiGetAuthenticatedUserResponseSchema = z.object({
  status: z.literal('ok'),
  results: lightdashUserSchema,
});

export type LightdashUser = z.infer<typeof lightdashUserSchema>;
