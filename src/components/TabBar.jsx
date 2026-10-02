import { SunIcon, CalendarIcon, ListIcon, GiftIcon, MedalIcon } from './Icons.jsx';

const TABS = [
  { id: 'hoy', label: 'Hoy', Icon: SunIcon },
  { id: 'calendario', label: 'Calendario', Icon: CalendarIcon },
  { id: 'tareas', label: 'Tareas', Icon: ListIcon },
  { id: 'premios', label: 'Premios', Icon: GiftIcon },
  { id: 'meritos', label: 'Méritos', Icon: MedalIcon }
];

export default function TabBar({ view, onChange }) {
  return (
    <nav className="tabs" aria-label="Secciones">
      <div className="tabs-inner">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className="tab"
            aria-current={view === id ? 'page' : undefined}
            onClick={() => onChange(id)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
