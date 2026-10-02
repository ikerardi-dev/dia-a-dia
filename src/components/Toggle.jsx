/** Interruptor con texto. Si onBeforeEnable devuelve false, no se activa. */
export default function Toggle({ id, label, hint, checked, onChange, onBeforeEnable }) {
  const change = async e => {
    const next = e.target.checked;
    if (next && onBeforeEnable && !(await onBeforeEnable())) return;
    onChange(next);
  };

  return (
    <label className="toggle" htmlFor={id}>
      <span className="toggle-text">
        <b>{label}</b>
        {hint && <span className="hint">{hint}</span>}
      </span>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={change} />
      <span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span>
    </label>
  );
}
