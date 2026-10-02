export default function EmptyState({ icon, title, text, children }) {
  return (
    <div className="card empty-state">
      <div className="big" aria-hidden="true">{icon}</div>
      <p className="lead">{title}</p>
      {text && <p className="sub">{text}</p>}
      <div className="row center">{children}</div>
    </div>
  );
}
