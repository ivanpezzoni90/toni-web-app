import type { KeyboardEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "./Select.module.scss";
import { mergeClassNames } from "@/lib/helpers";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  options: SelectOption[];
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
};

export default function Select({
  options,
  value,
  placeholder = "Select",
  disabled = false,
  className,
  onChange,
}: SelectProps) {
  const id = useId();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const selectedIndex = useMemo(
    () => options.findIndex((option) => option.value === value),
    [options, value]
  );

  const selectedLabel =
    selectedIndex >= 0 ? options[selectedIndex]?.label : "";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    setHighlightedIndex(nextIndex);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open || !listRef.current || highlightedIndex < 0) return;
    const item = listRef.current.children[
      highlightedIndex
    ] as HTMLElement | null;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, open]);

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setOpen(true);
        setHighlightedIndex((prev) =>
          Math.min(options.length - 1, Math.max(0, prev + 1))
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setOpen(true);
        setHighlightedIndex((prev) =>
          Math.max(0, Math.min(options.length - 1, prev - 1))
        );
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          break;
        }
        if (highlightedIndex >= 0) {
          handleSelect(options[highlightedIndex]);
        }
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={wrapRef}
      className={mergeClassNames(styles.wrap, className)}
      data-open={open ? "true" : "false"}
    >
      <button
        type="button"
        className={styles.trigger}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        disabled={disabled}
      >
        <span className={styles.value}>
          {selectedLabel || placeholder}
        </span>
        <span className={styles.chevron} aria-hidden="true" />
      </button>
      {open ? (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          ref={listRef}
          className={styles.menu}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${id}-opt-${highlightedIndex}` : undefined
          }
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;
            return (
              <li
                key={option.value}
                id={`${id}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                className={mergeClassNames(
                  styles.option,
                  isSelected ? styles.optionSelected : "",
                  isHighlighted ? styles.optionHighlighted : "",
                  option.disabled ? styles.optionDisabled : ""
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleSelect(option);
                }}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
