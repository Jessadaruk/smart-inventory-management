import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { canAttemptLogin, clearLoginAttempts } from "./login-limit";
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "เข้าสู่ระบบ",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (
          !credentials?.email ||
          !credentials.password ||
          Buffer.byteLength(credentials.password, "utf8") > 72
        )
          return null;
        const email = credentials.email.trim().toLowerCase();
        if (!canAttemptLogin(email)) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (
          !user?.isActive ||
          !(await compare(credentials.password, user.passwordHash))
        )
          return null;
        clearLoginAttempts(email);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.version = user.sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.sessionVersion = token.version ?? -1;
      return session;
    },
  },
};
// อ่านสถานะและสิทธิ์ล่าสุดจากฐานข้อมูลทุกครั้ง เพื่อให้การปิดบัญชีมีผลทันที
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isActive || user.sessionVersion !== session.user.sessionVersion)
    return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
