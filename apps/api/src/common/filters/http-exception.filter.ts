import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ErrorDto } from '@repo/types';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ErrorDto = {
      statusCode: status,
      error: defaultErrorName(status),
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      path: req.url,
    };

    if (isHttp) {
      const r = exception.getResponse();
      if (typeof r === 'string') body.message = r;
      else if (r && typeof r === 'object') {
        const rec = r as Record<string, unknown>;
        if (typeof rec.message === 'string') body.message = rec.message;
        else if (Array.isArray(rec.message)) body.message = rec.message.join(', ');
        if (typeof rec.code === 'string') body.code = rec.code;
        if ('details' in rec) body.details = rec.details;
        if (typeof rec.error === 'string') body.error = rec.error;
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.stack ?? exception.message);
      body.message = exception.message;
    } else {
      this.logger.error(`Unknown exception: ${String(exception)}`);
    }

    res.status(status).send(body);
  }
}

function defaultErrorName(status: number): string {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Unprocessable Entity';
    case 429:
      return 'Too Many Requests';
    default:
      return status >= 500 ? 'Internal Server Error' : 'Error';
  }
}
