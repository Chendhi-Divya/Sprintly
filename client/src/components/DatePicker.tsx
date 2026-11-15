
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

type CalendarPosition = {
  top: number;
  left: number;
};

function parseDate(value: string): Date | null {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isSameDate(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export default function DatePicker({
  value,
  onChange,
  min,
  disabled = false,
  placeholder = "Select date",
  className = "",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [calendarPosition, setCalendarPosition] =
    useState<CalendarPosition | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const selectedDate = parseDate(value);
  const minimumDate = parseDate(min ?? "");

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initialDate = selectedDate ?? new Date();

    return new Date(
      initialDate.getFullYear(),
      initialDate.getMonth(),
      1
    );
  });

  useEffect(() => {
    if (selectedDate) {
      setVisibleMonth(
        new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          1
        )
      );
    }
  }, [value]);

  // Position the calendar outside the modal and other containers.
  function calculateCalendarPosition() {
    const button = buttonRef.current;

    if (!button) return;

    const rect = button.getBoundingClientRect();

    const calendarWidth = 280;
    const calendarHeight = 340;
    const gap = 8;
    const padding = 8;

    const spaceOnLeft = rect.left - padding;
    const spaceOnRight = window.innerWidth - rect.right - padding;

    let left: number;

    // Prefer opening to the left of the date field.
    if (spaceOnLeft >= calendarWidth + gap) {
      left = rect.left - calendarWidth - gap;
    } else if (spaceOnRight >= calendarWidth + gap) {
      left = rect.right + gap;
    } else {
      left = Math.max(
        padding,
        Math.min(
          rect.left,
          window.innerWidth - calendarWidth - padding
        )
      );
    }

    // Keep the calendar inside the visible screen.
    const top = Math.max(
      padding,
      Math.min(
        rect.top,
        window.innerHeight - calendarHeight - padding
      )
    );

    setCalendarPosition({ top, left });
  }

  function openCalendar() {
    if (disabled) return;

    if (selectedDate) {
      setVisibleMonth(
        new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          1
        )
      );
    }

    calculateCalendarPosition();
    setIsOpen(true);
  }

  // Close when clicking outside the calendar and date field.
  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (
        wrapperRef.current?.contains(target) ||
        calendarRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    function handlePositionChange() {
      calculateCalendarPosition();
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handlePositionChange);
    window.addEventListener("scroll", handlePositionChange, true);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handlePositionChange);
      window.removeEventListener("scroll", handlePositionChange, true);
    };
  }, [isOpen]);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = Array.from(
    { length: firstDay + daysInMonth },
    (_, index) => {
      if (index < firstDay) return null;

      return index - firstDay + 1;
    }
  );

  function changeMonth(direction: number) {
    setVisibleMonth(
      new Date(year, month + direction, 1)
    );
  }

  function selectDate(day: number) {
    const date = new Date(year, month, day);

    if (minimumDate && date < minimumDate) return;

    onChange(formatDate(date));
    setIsOpen(false);
  }

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div
      ref={wrapperRef}
      className={`relative min-w-0 ${className}`}
    >
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            openCalendar();
          }
        }}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm text-gray-700 outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Choose date"
        aria-expanded={isOpen}
      >
        <span
          className={
            displayValue ? "text-gray-700" : "text-gray-400"
          }
        >
          {displayValue || placeholder}
        </span>

        <CalendarDays
          size={16}
          className="shrink-0 text-gray-400"
        />
      </button>

      {isOpen &&
        calendarPosition &&
        createPortal(
          <div
            ref={calendarRef}
            className="fixed z-[9999] w-[280px] rounded-xl border border-gray-200 bg-white p-3 shadow-2xl"
            style={{
              top: calendarPosition.top,
              left: calendarPosition.left,
            }}
          >
            {/* Calendar header */}
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label="Previous month"
              >
                <ChevronLeft size={17} />
              </button>

              <span className="text-sm font-semibold text-gray-800">
                {visibleMonth.toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </span>

              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label="Next month"
              >
                <ChevronRight size={17} />
              </button>
            </div>

            {/* Weekdays */}
            <div className="mb-2 grid grid-cols-7 text-center">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(
                (day) => (
                  <span
                    key={day}
                    className="py-2 text-xs font-semibold text-gray-400"
                  >
                    {day}
                  </span>
                )
              )}
            </div>

            {/* Calendar dates */}
            <div className="grid grid-cols-7 gap-y-1">
              {days.map((day, index) => {
                if (day === null) {
                  return <span key={`empty-${index}`} />;
                }

                const date = new Date(year, month, day);
                const dateValue = formatDate(date);

                const isSelected =
                  selectedDate !== null &&
                  isSameDate(date, selectedDate);

                const isToday = isSameDate(date, new Date());

                const isDisabled =
                  minimumDate !== null && date < minimumDate;

                return (
                  <button
                    key={dateValue}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => selectDate(day)}
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-xs transition ${
                      isSelected
                        ? "bg-blue-600 font-semibold text-white"
                        : isToday
                          ? "border border-blue-300 font-semibold text-blue-600"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                    } disabled:cursor-not-allowed disabled:opacity-30`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                disabled={!value}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition hover:text-red-600 disabled:opacity-40"
              >
                <X size={13} />
                Clear
              </button>

              <button
                type="button"
                onClick={() => {
                  const today = new Date();

                  if (minimumDate && today < minimumDate) {
                    return;
                  }

                  onChange(formatDate(today));
                  setIsOpen(false);
                }}
                disabled={
                  minimumDate !== null &&
                  new Date(
                    new Date().getFullYear(),
                    new Date().getMonth(),
                    new Date().getDate()
                  ) < minimumDate
                }
                className="text-xs font-semibold text-blue-600 transition hover:text-blue-700 disabled:opacity-40"
              >
                Today
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
