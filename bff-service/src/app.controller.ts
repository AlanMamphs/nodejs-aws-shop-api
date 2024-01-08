import { Controller, All, Request, Res } from '@nestjs/common';
import axios from 'axios';
import { Response } from 'express';

@Controller()
export class AppController {
  constructor() {}

  @All('/*')
  async product(@Request() req: Request, @Res() res: Response) {
    const { method, url, body, headers } = req;
    console.log('HEaders', headers);
    const headersObject = {};

    // Iterate over request headers and convert to object
    for (const [key, value] of Object.entries(req.headers)) {
      headersObject[key.toLowerCase()] = value;
    }
    const recepient = url.split('/')[1];

    const recepientURL = process.env[recepient];

    if (recepientURL) {
      const restOfUrl = url.replace(`/${recepient}`, '');
      const axiosConfig = {
        method,
        url: `${recepientURL}${restOfUrl}`,
        headers: {
          Authorization: headersObject['authorization'],
        },
        ...(Object.keys(body || {}).length > 0 ? { data: body } : {}),
      };
      console.log(axiosConfig);
      try {
        const response = await axios(axiosConfig);
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
