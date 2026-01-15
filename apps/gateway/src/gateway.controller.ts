/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller()
export class GatewayController {
  constructor(
    @Inject('CATALOG_CLIENT') private readonly catalogClient: ClientProxy,
    @Inject('MEDIA_CLIENT') private readonly mediaClient: ClientProxy,
    @Inject('SEARCH_CLIENT') private readonly searchClient: ClientProxy,
  ) {}

  @Get('health')
  async health() {
    const ping = async (serviceName: string, client: ClientProxy) => {
      try {
        const result = await firstValueFrom(
          client.send('service.ping', {
            from: 'gateway',
          }),
        );

        return {
          ok: true,
          service: serviceName,
          result,
        };
      } catch (err: any) {
        return {
          ok: false,
          service: serviceName,
          error: err?.message ?? 'unknown error',
        };
      }
    };

    const [catalog, media, search] = await Promise.all([
      ping('catalog', this.catalogClient),
      ping('media', this.mediaClient),
      ping('search', this.searchClient),
    ]);

    const ok = [catalog, media, search].every((s) => s.ok);

    return {
      ok,
      gateway: {
        service: 'gateway',
        now: new Date().toISOString(),
      },
      services: {
        catalog,
        media,
        search,
      },
    };
  }
}
