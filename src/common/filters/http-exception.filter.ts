import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res: any = exception.getResponse();
      message =
        typeof res === 'string' ? res : res.message || res.error || message;
    } else if (
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      'clientVersion' in exception
    ) {
      const prismaErr: any = exception;
      if (prismaErr.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        const target = Array.isArray(prismaErr.meta?.target)
          ? prismaErr.meta.target.join(', ')
          : 'unknown fields';
        message = `Unique constraint failed on the fields: ${target}`;
      } else if (prismaErr.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Record to update/delete not found';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message =
          typeof prismaErr.message === 'string'
            ? prismaErr.message.split('\n').pop()?.trim() ||
              'Prisma Database Error'
            : 'Prisma Database Error';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      code: status,
      message: Array.isArray(message) ? message[0] : message,
      data: {},
    });
  }
}
