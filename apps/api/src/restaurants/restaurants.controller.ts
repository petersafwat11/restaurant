import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Put,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
	type CreateRestaurantDto,
	CreateRestaurantSchema,
	type UpdateOperatingHoursDto,
	UpdateOperatingHoursSchema,
	type UpdateRestaurantDto,
	UpdateRestaurantSchema,
} from "@repo/types";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Public } from "../common/decorators/public.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { RestaurantsService } from "./restaurants.service";

@ApiTags("restaurants")
@Controller("restaurants")
export class RestaurantsController {
	constructor(private readonly restaurants: RestaurantsService) {}

	@Public()
	@Get()
	list() {
		return this.restaurants.list();
	}

	@Public()
	@Get(":slug")
	getBySlug(@Param("slug") slug: string) {
		return this.restaurants.getBySlug(slug);
	}

	@Post()
	@Permissions("restaurant:write")
	create(
		@Body(new ZodValidationPipe(CreateRestaurantSchema)) dto: CreateRestaurantDto,
	) {
		return this.restaurants.create(dto);
	}

	@Patch(":id")
	@Permissions("restaurant:write")
	update(
		@Param("id") id: string,
		@Body(new ZodValidationPipe(UpdateRestaurantSchema)) dto: UpdateRestaurantDto,
	) {
		return this.restaurants.update(id, dto);
	}

	@Public()
	@Get(":id/hours")
	getHours(@Param("id") id: string) {
		return this.restaurants.getHours(id);
	}

	@Put(":id/hours")
	@Permissions("restaurant:write")
	updateHours(
		@Param("id") id: string,
		@Body(new ZodValidationPipe(UpdateOperatingHoursSchema))
		dto: UpdateOperatingHoursDto,
	) {
		return this.restaurants.updateHours(id, dto);
	}
}
