import "next-auth";
import "next-auth/jwt";
declare module "next-auth" {
  interface User {
    sessionVersion: number;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      sessionVersion: number;
    };
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    version?: number;
  }
}
