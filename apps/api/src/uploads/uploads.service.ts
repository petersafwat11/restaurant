import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import {
	BadRequestException,
	Inject,
	Injectable,
	InternalServerErrorException,
	Logger,
} from '@nestjs/common';
import {
	ALLOWED_UPLOAD_MIME_TYPES,
	MAX_UPLOAD_BYTES,
	type UploadKind,
	type UploadResponseDto,
} from '@repo/types';
import { ENV, type ENV_TYPE } from '../config/config.module';

const MIME_TO_EXT: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
};

const KIND_PREFIX: Record<UploadKind, string> = {
	'menu-item-image': 'menu-items',
	'restaurant-logo': 'restaurants/logos',
	'restaurant-cover': 'restaurants/covers',
	'review-image': 'reviews',
};

export interface SaveFileInput {
	kind: UploadKind;
	mimeType: string;
	bytes: Buffer;
}

@Injectable()
export class UploadsService {
	private readonly logger = new Logger(UploadsService.name);
	private readonly rootDir: string;
	private readonly publicBase: string;

	constructor(@Inject(ENV) private readonly env: ENV_TYPE) {
		this.rootDir = resolve(env.UPLOADS_DIR);
		this.publicBase = `${env.APP_URL_API.replace(/\/+$/, '')}/uploads`;
	}

	async save(input: SaveFileInput): Promise<UploadResponseDto> {
		if (!ALLOWED_UPLOAD_MIME_TYPES.includes(input.mimeType as never)) {
			throw new BadRequestException('Unsupported mime type');
		}
		if (input.bytes.byteLength === 0) {
			throw new BadRequestException('Empty file');
		}
		if (input.bytes.byteLength > MAX_UPLOAD_BYTES) {
			throw new BadRequestException('File too large');
		}

		const ext = MIME_TO_EXT[input.mimeType] ?? 'bin';
		const key = `${KIND_PREFIX[input.kind]}/${randomUUID()}.${ext}`;
		const fullPath = join(this.rootDir, key);

		try {
			await fs.mkdir(join(this.rootDir, KIND_PREFIX[input.kind]), { recursive: true });
			await fs.writeFile(fullPath, input.bytes);
		} catch (err) {
			this.logger.error(`Failed to write upload ${key}`, err as Error);
			throw new InternalServerErrorException('Failed to save upload');
		}

		return { publicUrl: this.publicUrlForKey(key), key };
	}

	publicUrlForKey(key: string): string {
		return `${this.publicBase}/${key}`;
	}

	/**
	 * Inverse of `publicUrlForKey`. Returns null if the URL does not match the
	 * configured public base (legacy rows, external host URLs).
	 */
	extractKeyFromUrl(url: string): string | null {
		const prefix = `${this.publicBase}/`;
		return url.startsWith(prefix) ? url.slice(prefix.length) : null;
	}

	/**
	 * Best-effort delete. Errors are logged, not thrown.
	 */
	async deleteByKey(key: string): Promise<void> {
		const fullPath = join(this.rootDir, key);
		try {
			await fs.unlink(fullPath);
		} catch (err) {
			const code = (err as NodeJS.ErrnoException).code;
			if (code !== 'ENOENT') {
				this.logger.warn(`Delete failed for ${key}: ${(err as Error).message}`);
			}
		}
	}
}
