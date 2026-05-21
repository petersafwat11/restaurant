// Public surface of @repo/ui.
// One re-export per primitive folder, kept alphabetical.

export { cn } from './lib/cn';

// shadcn-wrapped Radix primitives (Button, Dialog, DropdownMenu, Sheet, …)
export * from './_shadcn';

// Tokens
export * from './tokens/order';
export * from './tokens/charts';
export * from './tokens/dish-flags';
export * from './tokens/order-tracking';

// Higher-level primitives
export { ActionModal, type ActionModalButton, type ActionModalProps } from './action-modal';
export {
  ActivityTimeline,
  type ActivityTimelineProps,
  type TimelineEntry,
} from './activity-timeline';
export {
  BulkActionBar,
  type BulkAction,
  type BulkActionBarProps,
} from './bulk-action-bar';
export { CurrencyInput, type CurrencyInputProps, type CurrencyValue } from './currency-input';
export { DateRangePicker, type DateRangePickerProps, type DateRange } from './date-range-picker';
export {
  DataTable,
  type DataTableProps,
  type DataTableRowDecorator,
  type DataTableSelectionState,
  type DataTableSortState,
  type ColumnDef,
} from './data-table';
export { type PaginationState } from './data-table/pagination';
export { DetailDrawer, type DetailDrawerProps } from './detail-drawer';
export {
  DragReorderList,
  type DragHandleProps,
  type DragReorderListProps,
} from './drag-reorder-list';
export {
  FilterPillGroup,
  type FilterPillGroupProps,
  type FilterPillOption,
} from './filter-pill-group';
export { FormField, type FormFieldProps } from './form-field';
export { ImageUploader, type ImageUploaderProps, type UploadedImage } from './image-uploader';
export { InlineEdit, type InlineEditProps } from './inline-edit';
export {
  KdsTicketCard,
  type KdsTicketCardProps,
  type KdsStatus,
  type KdsOrderType,
  type KdsItem,
} from './kds-ticket-card';
export { KeyValueGrid, type KeyValueGridProps, type KeyValueRow } from './key-value-grid';
export {
  MapSearchBox,
  type MapSearchBoxProps,
  type MapSearchResult,
} from './map-search-box';
export { PageHeader, type PageHeaderProps } from './page-header';
export {
  PolygonMapEditor,
  type PolygonMapEditorProps,
  type MapZone,
  type GeoJsonPolygon,
} from './polygon-map-editor';
export { RelativeTime, type RelativeTimeProps } from './relative-time';
export {
  ReservationCalendar,
  type ReservationCalendarProps,
  type ReservationCalendarBlock,
  type ReservationCalendarTable,
  type ReservationCalendarStatus,
  type MoveTarget,
} from './reservation-calendar';
export {
  SchedulePicker,
  type SchedulePickerProps,
  type ScheduleDay,
  type ScheduleWindow,
  type WeeklySchedule,
  SCHEDULE_DAYS,
} from './schedule-picker';
export {
  SectionedDrawerBody,
  type SectionedDrawerBodyProps,
  type DrawerSection,
} from './sectioned-drawer-body';
export {
  SettingsAnchorNav,
  type SettingsAnchorNavProps,
  type SettingsAnchorNavItem,
} from './settings-anchor-nav';
export {
  SettingsSectionCard,
  type SettingsSectionCardProps,
} from './settings-section-card';
export {
  Spinner,
  PageSpinner,
  type SpinnerProps,
  type SpinnerSize,
  type SpinnerTone,
  type PageSpinnerProps,
} from './spinner';
export { StatusPill, type StatusPillProps } from './status-pill';
export {
  TableToolbar,
  type TableToolbarProps,
  type ExportFormat,
} from './table-toolbar';
export { TwoPaneLayout, type TwoPaneLayoutProps } from './two-pane-layout';
export { TypeBadge, type TypeBadgeProps } from './type-badge';

// ---- Customer web primitives (Phase 1 — landing) -------------------------
export { CategoryCard, type CategoryCardProps } from './category-card';
export { Container, type ContainerProps } from './container';
export { DishCard, type DishCardProps } from './dish-card';
export { Hero, type HeroProps } from './hero';
export { HoursTable, type HoursTableProps, type HoursRow, type DayOfWeek } from './hours-table';
export { NewsletterForm, type NewsletterFormProps } from './newsletter-form';
export { SectionHeader, type SectionHeaderProps } from './section-header';
export { SiteFooter, type SiteFooterProps, type SiteFooterColumn } from './site-footer';
export { SiteNav, type SiteNavProps, type SiteNavLink } from './site-nav';
export { Stars, type StarsProps } from './stars';
export { TestimonialCard, type TestimonialCardProps } from './testimonial-card';

// ---- Customer web primitives (Phase 1 — menu) ----------------------------
export { CartLineItem, type CartLineItemProps, type CartLineDisplay } from './cart-line-item';
export { CartSheet, type CartSheetProps } from './cart-sheet';
export { EmptyState, type EmptyStateProps } from './empty-state';
export {
  FilterPillMultiGroup,
  type FilterPillMultiGroupProps,
  type FilterPillMultiOption,
} from './filter-pill-multi-group';
export {
  FloatingCartButton,
  type FloatingCartButtonProps,
} from './floating-cart-button';
export {
  ItemDetailSheet,
  type ItemDetailSheetProps,
  type DishDetail,
  type NewCartLine,
} from './item-detail-sheet';
export { MenuSubNav, type MenuSubNavProps, type MenuSubNavSection } from './menu-sub-nav';
export {
  ModifierGroup,
  type ModifierGroupProps,
  type ModifierGroupShape,
  type ModifierOptionShape,
} from './modifier-group';
export { QuantityStepper, type QuantityStepperProps } from './quantity-stepper';
export { SearchInput, type SearchInputProps } from './search-input';

// ---- Customer web primitives (Phase 1 — checkout) ------------------------
export {
  DeliveryLocationPicker,
  type DeliveryLocationPickerProps,
  type DeliveryLocationValue,
  type DeliveryZoneShape,
} from './delivery-location-picker';
export {
  CheckoutSection,
  type CheckoutSectionProps,
  type CheckoutSectionStatus,
} from './checkout-section';
export {
  OrderProgressStepper,
  type OrderProgressStepperProps,
} from './order-progress-stepper';
export {
  OrderSummaryPanel,
  type OrderSummaryPanelProps,
  type DeliveryRow,
} from './order-summary-panel';
export {
  PromoCodeInput,
  type PromoCodeInputProps,
  type AppliedPromo,
  type PromoApplyResult,
} from './promo-code-input';
export {
  RadioCardGroup,
  type RadioCardGroupProps,
  type RadioCardOption,
} from './radio-card-group';
export { SuccessHero, type SuccessHeroProps } from './success-hero';
export {
  TimeSlotPicker,
  type TimeSlotPickerProps,
  type TimeSlotValue,
} from './time-slot-picker';
export { TipPicker, type TipPickerProps } from './tip-picker';
