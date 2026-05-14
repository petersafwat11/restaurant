import { randomUUID } from "node:crypto";
import {
	DeleteObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
	BadRequestException,
	Inject,
	Injectable,
	InternalServerErrorException,
	Logger,
} from "@nestjs/common";
import {
	ALLOWED_UPLOAD_MIME_TYPES,
	MAX_UPLOAD_BYTES,
	type PresignUploadDto,
	type PresignedUploadResponseDto,
	type UploadKind,
} from "@repo/types";
import { ENV, type ENV_TYPE } from "../config/config.module";

const PRESIGN_TTL_SECONDS = 300; // 5 minutes per project plan

const MIME_TO_EXT: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};

const KIND_PREFIX: Record<UploadKind, string> = {
	"menu-item-image": "menu-items",
	"restaurant-logo": "restaurants/logos",
	"restaurant-cover": "restaurants/covers",
};

@Injectable()
export class UploadsService {
	private readonly logger = new Logger(UploadsService.name);
	private readonly s3: S3Client | null;
	private readonly stubMode: boolean;

	constructor(@Inject(ENV) private readonly env: ENV_TYPE) {
		this.stubMode =
			!env.R2_ENDPOINT ||
			!env.R2_ACCESS_KEY_ID ||
			!env.R2_SECRET_ACCESS_KEY ||
			!env.R2_BUCKET;

		if (this.stubMode) {
			this.logger.warn(
				"R2 credentials not configured — uploads service running in stub mode",
			);
			this.s3 = null;
		} else {
			this.s3 = new S3Client({
				region: env.R2_REGION,
				endpoint: env.R2_ENDPOINT,
				credentials: {
					accessKeyId: env.R2_ACCESS_KEY_ID,
					secretAccessKey: env.R2_SECRET_ACCESS_KEY,
				},
				forcePathStyle: true,
			});
		}
	}

	async presign(input: PresignUploadDto): Promise<PresignedUploadResponseDto> {
		// Schema already validates mime + size; defense-in-depth check here so
		// any bypass attempt still hits a guard.
		if (!ALLOWED_UPLOAD_MIME_TYPES.includes(input.mimeType)) {
			throw new BadRequestException("Unsupported mime type");
		}
		if (input.sizeBytes > MAX_UPLOAD_BYTES) {
			throw new BadRequestException("File too large");
		}

		const ext = MIME_TO_EXT[input.mimeType] ?? "bin";
		const key = `${KIND_PREFIX[input.kind]}/${randomUUID()}.${ext}`;

		if (this.stubMode || !this.s3) {
			const base = "http://localhost/no-r2";
			return {
				uploadUrl: `${base}/${key}`,
				publicUrl: `${base}/${key}`,
				key,
				expiresIn: PRESIGN_TTL_SECONDS,
			};
		}

		try {
			const command = new PutObjectCommand({
				Bucket: this.env.R2_BUCKET,
				Key: key,
				ContentType: input.mimeType,
				ContentLength: input.sizeBytes,
			});
			const uploadUrl = await getSignedUrl(this.s3, command, {
				expiresIn: PRESIGN_TTL_SECONDS,
			});
			const publicBase = (this.env.R2_PUBLIC_URL || this.env.R2_ENDPOINT)
				.replace(/\/+$/, "");
			const publicUrl = this.env.R2_PUBLIC_URL
				? `${publicBase}/${key}`
				: `${publicBase}/${this.env.R2_BUCKET}/${key}`;
			return { uploadUrl, publicUrl, key, expiresIn: PRESIGN_TTL_SECONDS };
		} catch (err) {
			this.logger.error("Failed to presign upload", err as Error);
			throw new InternalServerErrorException("Failed to presign upload");
		}
	}

	publicUrlForKey(key: string): string {
		if (this.stubMode) return `http://localhost/no-r2/${key}`;
		const publicBase = (this.env.R2_PUBLIC_URL || this.env.R2_ENDPOINT).replace(
			/\/+$/,
			"",
		);
		return this.env.R2_PUBLIC_URL
			? `${publicBase}/${key}`
			: `${publicBase}/${this.env.R2_BUCKET}/${key}`;
	}

	/**
	 * Inverse of `publicUrlForKey`. Returns null if the URL does not match a
	 * known public-URL shape (e.g., legacy rows or external host URLs we
	 * shouldn't touch).
	 */
	extractKeyFromUrl(url: string): string | null {
		if (this.stubMode) {
			const m = /^https?:\/\/localhost\/no-r2\/(.+)$/.exec(url);
			return m?.[1] ?? null;
		}
		const candidates: string[] = [];
		if (this.env.R2_PUBLIC_URL) {
			candidates.push(this.env.R2_PUBLIC_URL.replace(/\/+$/, ""));
		}
		const endpoint = this.env.R2_ENDPOINT.replace(/\/+$/, "");
		candidates.push(`${endpoint}/${this.env.R2_BUCKET}`);
		for (const prefix of candidates) {
			if (url.startsWith(`${prefix}/`)) {
				return url.slice(prefix.length + 1);
			}
		}
		return null;
	}

	/**
	 * Best-effort delete of an R2 object. Errors are logged, not thrown — the
	 * orphan-sweep job is the safety net for any failures here.
	 */
	async deleteObject(key: string): Promise<void> {
		if (this.stubMode || !this.s3) {
			this.logger.debug(`R2 stub — skipping delete for ${key}`);
			return;
		}
		try {
			await this.s3.send(
				new DeleteObjectCommand({ Bucket: this.env.R2_BUCKET, Key: key }),
			);
		} catch (err) {
			this.logger.warn(`R2 delete failed for ${key}: ${(err as Error).message}`);
		}
	}

	/**
	 * List all object keys in the bucket. Streams pages internally and returns
	 * everything; only meant for the orphan-sweep job (small buckets in dev,
	 * production buckets stay under a few thousand keys per the project plan).
	 */
	async *listAllKeys(): AsyncGenerator<{ key: string; lastModified: Date | null }> {
		if (this.stubMode || !this.s3) return;
		let token: string | undefined;
		do {
			const res = await this.s3.send(
				new ListObjectsV2Command({
					Bucket: this.env.R2_BUCKET,
					ContinuationToken: token,
				}),
			);
			for (const obj of res.Contents ?? []) {
				if (!obj.Key) continue;
				yield { key: obj.Key, lastModified: obj.LastModified ?? null };
			}
			token = res.NextContinuationToken;
		} while (token);
	}

	get isStubMode(): boolean {
		return this.stubMode;
	}
}
