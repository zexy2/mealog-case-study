import { ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
/** Keep parser and Multer failures on the Python API's wire contract. */
export declare class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void;
}
