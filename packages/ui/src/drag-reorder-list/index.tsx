'use client';

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface DragHandleProps {
  /** Spread these onto the element that should act as the drag handle. */
  attributes: React.HTMLAttributes<HTMLElement>;
  listeners: React.HTMLAttributes<HTMLElement> | undefined;
  className: string;
}

export interface DragReorderListProps<T> {
  items: T[];
  rowKey: (item: T) => string;
  onReorder: (next: T[]) => void;
  renderItem: (
    item: T,
    state: { isDragging: boolean; handle: DragHandleProps },
  ) => React.ReactNode;
  orientation?: 'vertical' | 'horizontal';
  /** px between rows; defaults to 8 vertical / 10 horizontal. */
  gap?: number;
  disabled?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}

/**
 * Accessible drag-to-reorder list built on `@dnd-kit/sortable`. Keyboard:
 * Space/Enter grabs an item, arrows move, Space drops, Esc cancels. The
 * caller's render function gets `handle` props to wire onto whichever
 * element should act as the drag handle (usually a grip-icon button).
 *
 * Page-3 fix #1: every nested reorder (modifier groups → options) composes
 * this primitive — no bespoke drag logic per surface.
 */
export function DragReorderList<T>({
  items,
  rowKey,
  onReorder,
  renderItem,
  orientation = 'vertical',
  gap,
  disabled,
  emptyState,
  className,
}: DragReorderListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = React.useMemo(() => items.map(rowKey), [items, rowKey]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  }

  if (items.length === 0 && emptyState) return <>{emptyState}</>;

  const strategy =
    orientation === 'horizontal' ? horizontalListSortingStrategy : verticalListSortingStrategy;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={strategy} disabled={disabled}>
        <div
          className={cn(
            orientation === 'horizontal' ? 'flex' : 'flex flex-col',
            className,
          )}
          style={{ gap: gap ?? (orientation === 'horizontal' ? 10 : 8) }}
        >
          {items.map((item) => (
            <SortableRow
              key={rowKey(item)}
              id={rowKey(item)}
              item={item}
              render={renderItem}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface SortableRowProps<T> {
  id: string;
  item: T;
  render: DragReorderListProps<T>['renderItem'];
  disabled?: boolean;
}

function SortableRow<T>({ id, item, render, disabled }: SortableRowProps<T>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const handle: DragHandleProps = {
    attributes,
    listeners,
    className:
      'cursor-grab text-fg-subtle hover:text-fg active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {render(item, { isDragging, handle })}
    </div>
  );
}
