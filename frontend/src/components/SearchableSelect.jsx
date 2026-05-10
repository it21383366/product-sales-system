import { useEffect, useRef, useState } from "react";

function SearchableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select option",
  searchPlaceholder = "Search...",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="searchable-select-wrapper" ref={wrapperRef}>
      {label && <label>{label}</label>}

      <button
        type="button"
        className="searchable-select-button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <span>⌄</span>
      </button>

      {open && (
        <div className="searchable-select-menu">
          <input
            className="searchable-select-search"
            value={search}
            placeholder={searchPlaceholder}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          <div className="searchable-select-options">
            {filteredOptions.length === 0 && (
              <div className="searchable-select-empty">No results found</div>
            )}

            {filteredOptions.map((option) => (
              <button
                type="button"
                key={option.value || "empty-option"}
                className={`searchable-select-option ${
                  value === option.value ? "selected" : ""
                }`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setSearch("");
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;