/**
 * Grupo de opciones con aspecto de botón.
 * multiple = false → radio (value es un valor); true → checkbox (value es un array)
 */
export default function OptionChips({ name, options, value, onChange, multiple = false, className = 'chips' }) {
  const isChecked = v => (multiple ? value.includes(v) : value === v);

  const toggle = v => {
    if (!multiple) return onChange(v);
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  };

  return (
    <div className={className}>
      {options.map(opt => (
        <label key={String(opt.value)} className="opt">
          <input
            type={multiple ? 'checkbox' : 'radio'}
            name={name}
            checked={isChecked(opt.value)}
            onChange={() => toggle(opt.value)}
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}
