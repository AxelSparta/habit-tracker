"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId, type ReactNode } from "react";

/**
 * Lista que se puede reordenar arrastrando la manija de cada elemento
 * (mouse, touch o teclado: Espacio para agarrar, flechas para mover).
 */
export function SortableList<T extends { id: string }>({
  items,
  getLabel,
  onReorder,
  renderItem,
  className,
}: {
  items: T[];
  /** Nombre del elemento, para lectores de pantalla. */
  getLabel: (item: T) => string;
  /** Recibe los ids en el orden nuevo. */
  onReorder: (ids: string[]) => void;
  /** `handle` es la manija para arrastrar; ubicala dentro del elemento. */
  renderItem: (item: T, handle: ReactNode) => ReactNode;
  className?: string;
}) {
  // id estable entre servidor y cliente (evita errores de hidratación).
  const id = useId();
  const sensors = useSensors(
    // La distancia mínima evita que un click en la manija empiece un arrastre.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const labelOf = (itemId: UniqueIdentifier) => {
    const item = items.find((i) => i.id === itemId);
    return item ? getLabel(item) : "";
  };
  const positionOf = (itemId: UniqueIdentifier) =>
    items.findIndex((i) => i.id === itemId) + 1;

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Agarraste ${labelOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${labelOf(active.id)} está en la posición ${positionOf(over.id)} de ${items.length}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Soltaste ${labelOf(active.id)} en la posición ${positionOf(over.id)} de ${items.length}.`
        : `Soltaste ${labelOf(active.id)}.`,
    onDragCancel: ({ active }) =>
      `Cancelado. ${labelOf(active.id)} volvió a su lugar.`,
  };

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = items.map((i) => i.id);
    onReorder(
      arrayMove(
        ids,
        ids.indexOf(String(active.id)),
        ids.indexOf(String(over.id)),
      ),
    );
  }

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Para reordenar, presioná Espacio o Enter, movelo con las flechas y volvé a presionar Espacio o Enter para soltarlo. Escape cancela.",
        },
      }}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id} label={getLabel(item)}>
              {(handle) => renderItem(item, handle)}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={
        isDragging ? "relative z-10 rounded-xl opacity-80 shadow-lg" : undefined
      }
    >
      {children(
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reordenar ${label}`}
          // `touch-none`: en el celular, arrastrar la manija no hace scroll.
          className="flex shrink-0 cursor-grab touch-none items-center self-stretch rounded-md px-1 text-muted hover:text-foreground active:cursor-grabbing"
        >
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-4"
          >
            <circle cx="7" cy="5" r="1.5" />
            <circle cx="13" cy="5" r="1.5" />
            <circle cx="7" cy="10" r="1.5" />
            <circle cx="13" cy="10" r="1.5" />
            <circle cx="7" cy="15" r="1.5" />
            <circle cx="13" cy="15" r="1.5" />
          </svg>
        </button>,
      )}
    </li>
  );
}
