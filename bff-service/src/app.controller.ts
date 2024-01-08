import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Controller, All, Request, Res, Inject } from '@nestjs/common';
import axios from 'axios';
import { Cache } from 'cache-manager';
import { Response } from 'express';

@Controller()
export class AppController {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  @All('/*')
  async product(@Request() req: Request, @Res() res: Response) {
    const { method, url, body, headers } = req;

    // Iterate over request headers and lower case the keys
    const headersObject = {};
    for (const [key, value] of Object.entries(headers)) {
      headersObject[key.toLowerCase()] = value;
    }

    const recepient = url.split('/')[1];
    const recepientURL = process.env[recepient];

    if (recepientURL) {
      const restOfUrl = url.replace(`/${recepient}`, '');
      const cachedProducts = await this.cacheManager.get('products');
      console.log(cachedProducts);
      if (restOfUrl === '/products' && method === 'GET' && cachedProducts) {
        console.log('Returning cached data');
        return res.status(200).json(JSON.parse(cachedProducts as string));
      }

      const axiosConfig = {
        method,
        url: `${recepientURL}${restOfUrl}`,
        headers: {
          Authorization: headersObject['authorization'],
        },
        ...(Object.keys(body || {}).length > 0 ? { data: body } : {}),
      };
      try {
        const response = await axios(axiosConfig);
        if (restOfUrl === '/products' && method === 'GET') {
          console.log('Setting cached data', response.data);
          await this.cacheManager.set(
            'products',
            JSON.stringify(response.data),
          );
        }
        return res.status(200).json(response.data);
      } catch (e) {
        if (e.response) {
          const { data, status } = e.response;
          return res.status(status).json(data);
        }
        return res.status(500).json({ message: e.message });
      }
    }
  }
}
