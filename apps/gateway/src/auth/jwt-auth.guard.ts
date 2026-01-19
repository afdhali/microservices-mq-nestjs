import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserContext } from './auth.types';
import { IS_PUBLIC_KEY } from './public.decorator';
import { REQUIRED_ROLE_KEY } from './admin.decorator';

interface RequestWithUser extends Request {
  user?: UserContext;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    // Extract and validate token
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Missing or invalid authorization token');
    }

    // Verify token and get user context from JWT
    const jwtUserContext = await this.authService.verifyAndBuildContext(token);

    // Sync user with database and get the actual role from DB
    const dbUser = await this.usersService.upsertAuthUser({
      clerkUserId: jwtUserContext.clerkUserId,
      email: jwtUserContext.email,
      name: jwtUserContext.name,
    });

    // Attach user context to request (role from database takes precedence)
    request.user = {
      ...jwtUserContext,
      role: dbUser.role,
    };

    // Check role-based access control
    this.checkRoleAccess(context, request.user);

    return true;
  }

  private extractTokenFromHeader(request: Request): string | null {
    const authorization = request.headers.authorization;

    if (!authorization || typeof authorization !== 'string') {
      return null;
    }

    const [type, token] = authorization.split(' ');

    return type === 'Bearer' && token ? token.trim() : null;
  }

  private checkRoleAccess(context: ExecutionContext, user: UserContext): void {
    const requiredRole = this.reflector.getAllAndOverride<string>(
      REQUIRED_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRole === 'admin' && user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
  }
}
