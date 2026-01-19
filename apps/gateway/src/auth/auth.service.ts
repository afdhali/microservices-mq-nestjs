import { createClerkClient, verifyToken } from '@clerk/backend';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserContext } from './auth.types';

interface ClerkJWTPayload {
  // Default claims (selalu ada di JWT Template)
  sub: string; // User ID
  exp: number;
  iat: number;
  nbf: number;
  iss: string;
  jti: string;
  azp?: string;

  // Custom claims dari JWT template Anda
  email?: string;
  name?: string;
  full_name?: string;
  role?: string;

  // Custom claims lainnya yang mungkin Anda tambahkan
  [key: string]: any;
}

@Injectable()
export class AuthService {
  private readonly clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });

  private jwtVerifyOptions(): Record<string, any> {
    return {
      secretKey: process.env.CLERK_SECRET_KEY,
    };
  }

  private extractRole(payload: ClerkJWTPayload): 'user' | 'admin' {
    // Cek dari custom claim 'role' di JWT template
    if (payload.role === 'admin') {
      return 'admin';
    }

    // Atau bisa dari custom claim lainnya
    // Contoh: payload.user_role, payload.permissions, etc.

    return 'user';
  }

  async verifyAndBuildContext(token: string): Promise<UserContext> {
    try {
      // payload decode
      const payload = (await verifyToken(
        token,
        this.jwtVerifyOptions(),
      )) as unknown as ClerkJWTPayload;

      const clerkUserId = payload.sub;

      if (!clerkUserId) {
        throw new UnauthorizedException('Token is missing user id (sub claim)');
      }

      // Ambil email dan name dari custom claims di JWT template
      // Jika tidak ada, fallback ke fetch user data dari Clerk API
      let email = payload.email || '';
      let name = payload.name || payload.full_name || '';
      let role: 'user' | 'admin' = this.extractRole(payload);

      // Jika email atau name tidak ada di token, fetch dari Clerk API
      if (!email || !name) {
        const user = await this.clerk.users.getUser(clerkUserId);

        if (!email) {
          email =
            user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
              ?.emailAddress ??
            user.emailAddresses[0]?.emailAddress ??
            '';
        }

        if (!name) {
          name =
            [user.firstName, user.lastName].filter(Boolean).join(' ') ||
            user.username ||
            email ||
            clerkUserId;
        }

        // Jika role belum di-set dari token, cek dari user metadata
        if (role === 'user' && user.publicMetadata?.role === 'admin') {
          role = 'admin';
        }
      }

      return {
        clerkUserId,
        email,
        name,
        role,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
