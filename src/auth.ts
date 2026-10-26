import { NextFunction, Request, Response } from "express";

export type Role = "BUYER" | "PRODUCER" | "ADMIN";

export interface AuthUser {
  id: string;
  role: Role;
}

export function currentUser(req: Request): AuthUser | undefined {
  const token = process.env.INTERNAL_TOKEN;
  if (token && req.header("x-internal-token") !== token) return undefined;
  const id = req.header("x-user-id");
  const role = req.header("x-user-role") as Role | undefined;
  return id && role ? { id, role } : undefined;
}

export function requireUser(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: "Debes iniciar sesión" });
    if (roles.length > 0 && user.role !== "ADMIN" && !roles.includes(user.role)) {
      return res.status(403).json({ error: "No tienes permiso para esta acción" });
    }
    res.locals.user = user;
    next();
  };
}

export const userOf = (res: Response) => res.locals.user as AuthUser;
