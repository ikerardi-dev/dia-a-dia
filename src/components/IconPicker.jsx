import OptionChips from './OptionChips.jsx';

export default function IconPicker({ icons, value, onChange }) {
  return (
    <OptionChips
      name="icon"
      className="icons-grid"
      options={icons.map(i => ({ value: i, label: i }))}
      value={value}
      onChange={onChange}
    />
  );
}
