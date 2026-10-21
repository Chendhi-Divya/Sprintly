import type { Request, Response, NextFunction } from "express";
export declare const checkProjectMember: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const checkTaskProjectMember: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=projectAuthorization.d.ts.map