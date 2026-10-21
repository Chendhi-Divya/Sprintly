import { type Request, type Response, type NextFunction } from "express";
declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export default authMiddleware;
//# sourceMappingURL=authMiddleware.d.ts.map