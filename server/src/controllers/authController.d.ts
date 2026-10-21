import { type Request, type Response } from "express";
export declare const forgotPassword: (req: any, res: any) => Promise<any>;
export declare const registerUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const verifyEmailOTP: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const loginUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const logoutUser: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCurrentUser: (req: Request & {
    userId?: string;
}, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const resendOTP: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const resetPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=authController.d.ts.map