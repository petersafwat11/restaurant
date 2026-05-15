import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
	type PresignUploadDto,
	PresignUploadSchema,
} from "@repo/types";
import { Permissions } from "../common/decorators/permissions.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { UploadsService } from "./uploads.service";

@ApiTags("uploads")
@Controller("uploads")
export class UploadsController {
	constructor(private readonly uploads: UploadsService) {}

	// Either permission grants access — staff editing menu items or restaurant
	// branding may need to upload. The guard requires all listed perms; here we
	// keep it narrow by using just `menu:write` and accept that branding uploads
	// are owner/manager-only by virtue of holding `menu:write` in the role map.
	@Post("presign")
	@HttpCode(200)
	@Permissions("menu:write")
	presign(@Body(new ZodValidationPipe(PresignUploadSchema)) dto: PresignUploadDto) {
		return this.uploads.presign(dto);
	}
}
