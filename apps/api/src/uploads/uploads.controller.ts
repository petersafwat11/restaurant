import {
	BadRequestException,
	Controller,
	HttpCode,
	PayloadTooLargeException,
	Post,
	Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
	ALLOWED_UPLOAD_MIME_TYPES,
	MAX_UPLOAD_BYTES,
	UploadKindSchema,
} from '@repo/types';
import type { FastifyRequest } from 'fastify';
import { Permissions } from '../common/decorators/permissions.decorator';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
	constructor(private readonly uploads: UploadsService) {}

	/**
	 * Accepts a multipart/form-data POST with two fields:
	 *   - `kind`: one of UploadKind
	 *   - `file`: the binary file (≤ 5 MB, JPG/PNG/WebP)
	 * Returns `{ publicUrl, key }`. Caller is responsible for creating the
	 * relevant DB row that references `key`.
	 */
	@Post()
	@HttpCode(201)
	@Permissions('menu:write')
	async upload(@Req() req: FastifyRequest) {
		// `req.file()` is added by @fastify/multipart (registered in main.ts).
		// Cast via unknown to avoid leaking the plugin's types into the public
		// FastifyRequest declaration.
		const file = await (
			req as unknown as { file: () => Promise<MultipartFile | undefined> }
		).file();
		if (!file) {
			throw new BadRequestException('No file uploaded');
		}

		const kindParsed = UploadKindSchema.safeParse(file.fields.kind?.value);
		if (!kindParsed.success) {
			throw new BadRequestException('Missing or invalid "kind" field');
		}

		const mimeType = file.mimetype;
		if (!ALLOWED_UPLOAD_MIME_TYPES.includes(mimeType as never)) {
			throw new BadRequestException('Unsupported mime type');
		}

		// @fastify/multipart enforces `limits.fileSize` while streaming. On
		// overflow it either marks `truncated=true` or throws
		// `FST_REQ_FILE_TOO_LARGE` from `toBuffer()` depending on version —
		// translate both cases into a 413 instead of letting the error bubble
		// up as a 500.
		let bytes: Buffer;
		try {
			bytes = await file.toBuffer();
		} catch (err) {
			if (
				err instanceof Error &&
				((err as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE' ||
					err.message.includes('file too large'))
			) {
				throw new PayloadTooLargeException(
					`File must be ≤ ${MAX_UPLOAD_BYTES} bytes (5MB)`,
				);
			}
			throw err;
		}
		if (file.truncated || bytes.byteLength > MAX_UPLOAD_BYTES) {
			throw new PayloadTooLargeException(`File must be ≤ ${MAX_UPLOAD_BYTES} bytes (5MB)`);
		}

		return this.uploads.save({
			kind: kindParsed.data,
			mimeType,
			bytes,
		});
	}
}

// Minimal local typing for the multipart file shape we touch — avoids a
// runtime dep on @fastify/multipart's TS types from the controller layer.
interface MultipartFile {
	mimetype: string;
	truncated: boolean;
	fields: Record<string, { value: string } | undefined>;
	toBuffer: () => Promise<Buffer>;
}
