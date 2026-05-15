import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	Patch,
	Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
	type AddMenuItemImageDto,
	AddMenuItemImageSchema,
	type CreateMenuCategoryDto,
	CreateMenuCategorySchema,
	type CreateMenuItemDto,
	CreateMenuItemSchema,
	type CreateModifierGroupDto,
	CreateModifierGroupSchema,
	type CreateModifierOptionDto,
	CreateModifierOptionSchema,
	type ReorderDto,
	type ReorderItemsDto,
	ReorderItemsSchema,
	ReorderSchema,
	type SetItemAvailabilityDto,
	SetItemAvailabilitySchema,
	type UpdateMenuCategoryDto,
	UpdateMenuCategorySchema,
	type UpdateMenuItemDto,
	UpdateMenuItemSchema,
	type UpdateModifierGroupDto,
	UpdateModifierGroupSchema,
	type UpdateModifierOptionDto,
	UpdateModifierOptionSchema,
} from "@repo/types";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Public } from "../common/decorators/public.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { MenuService } from "./menu.service";

@ApiTags("menu")
@Controller()
export class MenuController {
	constructor(private readonly menu: MenuService) {}

	// ---- Public reads -------------------------------------------------------

	@Public()
	@Get("restaurants/:restaurantId/menu")
	getTree(@Param("restaurantId") restaurantId: string) {
		return this.menu.getTree(restaurantId);
	}

	@Public()
	@Get(
		"restaurants/:restaurantId/menu/categories/:categorySlug/items/:itemSlug",
	)
	getItem(
		@Param("restaurantId") restaurantId: string,
		@Param("categorySlug") categorySlug: string,
		@Param("itemSlug") itemSlug: string,
	) {
		return this.menu.getItem(restaurantId, categorySlug, itemSlug);
	}

	// ---- Categories ---------------------------------------------------------

	@Post("menu/categories")
	@Permissions("menu:write")
	createCategory(
		@Body(new ZodValidationPipe(CreateMenuCategorySchema))
		dto: CreateMenuCategoryDto,
	) {
		return this.menu.createCategory(dto);
	}

	@Patch("menu/categories/:id")
	@Permissions("menu:write")
	updateCategory(
		@Param("id") id: string,
		@Body(new ZodValidationPipe(UpdateMenuCategorySchema))
		dto: UpdateMenuCategoryDto,
	) {
		return this.menu.updateCategory(id, dto);
	}

	@Delete("menu/categories/:id")
	@HttpCode(200)
	@Permissions("menu:write")
	async deleteCategory(@Param("id") id: string) {
		await this.menu.deleteCategory(id);
		return { success: true as const };
	}

	@Post("menu/categories/reorder")
	@HttpCode(200)
	@Permissions("menu:write")
	async reorderCategories(
		@Body(new ZodValidationPipe(ReorderSchema)) dto: ReorderDto,
	) {
		await this.menu.reorderCategories(dto);
		return { success: true as const };
	}

	// ---- Items --------------------------------------------------------------

	@Post("menu/items")
	@Permissions("menu:write")
	createItem(
		@Body(new ZodValidationPipe(CreateMenuItemSchema)) dto: CreateMenuItemDto,
	) {
		return this.menu.createItem(dto);
	}

	@Patch("menu/items/:id")
	@Permissions("menu:write")
	updateItem(
		@Param("id") id: string,
		@Body(new ZodValidationPipe(UpdateMenuItemSchema)) dto: UpdateMenuItemDto,
	) {
		return this.menu.updateItem(id, dto);
	}

	@Delete("menu/items/:id")
	@HttpCode(200)
	@Permissions("menu:write")
	async deleteItem(@Param("id") id: string) {
		await this.menu.deleteItem(id);
		return { success: true as const };
	}

	@Post("menu/items/:id/availability")
	@HttpCode(200)
	@Permissions("menu:write")
	setItemAvailability(
		@Param("id") id: string,
		@Body(new ZodValidationPipe(SetItemAvailabilitySchema))
		dto: SetItemAvailabilityDto,
	) {
		return this.menu.setItemAvailability(id, dto);
	}

	@Post("menu/items/reorder")
	@HttpCode(200)
	@Permissions("menu:write")
	async reorderItems(
		@Body(new ZodValidationPipe(ReorderItemsSchema)) dto: ReorderItemsDto,
	) {
		await this.menu.reorderItems(dto);
		return { success: true as const };
	}

	// ---- Item images --------------------------------------------------------

	@Post("menu/items/:id/images")
	@Permissions("menu:write")
	addImage(
		@Param("id") id: string,
		@Body(new ZodValidationPipe(AddMenuItemImageSchema))
		dto: AddMenuItemImageDto,
	) {
		return this.menu.addItemImage(id, dto);
	}

	@Delete("menu/items/:id/images/:imageId")
	@HttpCode(200)
	@Permissions("menu:write")
	async removeImage(
		@Param("id") id: string,
		@Param("imageId") imageId: string,
	) {
		await this.menu.removeItemImage(id, imageId);
		return { success: true as const };
	}

	@Post("menu/items/:id/images/reorder")
	@HttpCode(200)
	@Permissions("menu:write")
	async reorderImages(
		@Param("id") id: string,
		@Body(new ZodValidationPipe(ReorderSchema)) dto: ReorderDto,
	) {
		await this.menu.reorderItemImages(id, dto);
		return { success: true as const };
	}

	// ---- Modifier groups ----------------------------------------------------

	@Post("menu/items/:id/modifier-groups")
	@Permissions("menu:write")
	createModifierGroup(
		@Param("id") id: string,
		@Body(new ZodValidationPipe(CreateModifierGroupSchema))
		dto: CreateModifierGroupDto,
	) {
		return this.menu.createModifierGroup(id, dto);
	}

	@Patch("menu/modifier-groups/:id")
	@Permissions("menu:write")
	updateModifierGroup(
		@Param("id") id: string,
		@Body(new ZodValidationPipe(UpdateModifierGroupSchema))
		dto: UpdateModifierGroupDto,
	) {
		return this.menu.updateModifierGroup(id, dto);
	}

	@Delete("menu/modifier-groups/:id")
	@HttpCode(200)
	@Permissions("menu:write")
	async deleteModifierGroup(@Param("id") id: string) {
		await this.menu.deleteModifierGroup(id);
		return { success: true as const };
	}

	// ---- Modifier options ---------------------------------------------------

	@Post("menu/modifier-groups/:id/options")
	@Permissions("menu:write")
	createModifierOption(
		@Param("id") id: string,
		@Body(new ZodValidationPipe(CreateModifierOptionSchema))
		dto: CreateModifierOptionDto,
	) {
		return this.menu.createModifierOption(id, dto);
	}

	@Patch("menu/modifier-options/:id")
	@Permissions("menu:write")
	updateModifierOption(
		@Param("id") id: string,
		@Body(new ZodValidationPipe(UpdateModifierOptionSchema))
		dto: UpdateModifierOptionDto,
	) {
		return this.menu.updateModifierOption(id, dto);
	}

	@Delete("menu/modifier-options/:id")
	@HttpCode(200)
	@Permissions("menu:write")
	async deleteModifierOption(@Param("id") id: string) {
		await this.menu.deleteModifierOption(id);
		return { success: true as const };
	}
}
