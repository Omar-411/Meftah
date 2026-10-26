import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import type { Response } from "express";
import { ForbiddenError, NotFoundError } from "../../../application/errors";
import type { SessionRequest } from "../session";

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("Http");

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<SessionRequest>();

    if (exception instanceof ForbiddenError) {
      // No session at all means "log in", not "you may not".
      const status = request.session ? 403 : 401;
      return response.status(status).json({ message: exception.message });
    }
    if (exception instanceof NotFoundError) return response.status(404).json({ message: exception.message });

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const payload = typeof body === "string" ? { message: body } : (body as { message?: unknown; fields?: unknown });
      const message = Array.isArray(payload.message) ? payload.message.join(" ") : (payload.message ?? exception.message);
      return response.status(exception.getStatus()).json({ message, ...(payload.fields ? { fields: payload.fields } : {}) });
    }

    if (typeof exception === "object" && exception !== null && (exception as { status?: unknown }).status === 413) {
      return response.status(413).json({ message: "Les photos sont trop lourdes. Retirez-en ou utilisez des images plus petites." });
    }

    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    return response.status(500).json({ message: "Erreur interne du serveur." });
  }
}
