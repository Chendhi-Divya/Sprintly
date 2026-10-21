import { z } from "zod";
export declare const registerSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const verifyOTPSchema: z.ZodObject<{
    email: z.ZodString;
    otp: z.ZodString;
}, z.core.$strip>;
export declare const resendOTPSchema: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=authSchema.d.ts.map