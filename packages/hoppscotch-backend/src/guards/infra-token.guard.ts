import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DateTime } from 'luxon';
import {
  INFRA_TOKEN_EXPIRED,
  INFRA_TOKEN_HEADER_MISSING,
  INFRA_TOKEN_INVALID_TOKEN,
} from 'src/errors';

@Injectable()
export class InfraTokenGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers['authorization'];

    if (!authorization) {
      throw new UnauthorizedException(INFRA_TOKEN_HEADER_MISSING);
    }

    const token = authorization.startsWith('Bearer ')
      ? authorization.split(' ')[1]
      : authorization;

    if (!token) throw new UnauthorizedException(INFRA_TOKEN_INVALID_TOKEN);

    const infraToken = await this.prisma.infraToken.findUnique({
      where: { token },
    });

    if (infraToken === null)
      throw new UnauthorizedException(INFRA_TOKEN_INVALID_TOKEN);

    const currentTime = DateTime.now().toISO();
    if (currentTime > infraToken.expiresOn.toISOString()) {
      throw new UnauthorizedException(INFRA_TOKEN_EXPIRED);
    }

    return true;
  }
}
