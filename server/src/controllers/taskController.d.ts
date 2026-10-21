import type { Request, Response } from "express";
export declare const createTask: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTasks: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTaskById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateTask: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteTask: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=taskController.d.ts.map