export default function Sidebar({ expanded, onToggle }) {
  const NavItem = ({ icon, label, active }) => (
    <div className={`nav-item${active ? " active" : ""}`}>
      {icon}
      {expanded && <span className="label">{label}</span>}
    </div>
  );
  const icons = {
    discover: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3l3 7 7 2-7 2-3 7-3-7-7-2 7-2 3-7z" stroke="currentColor" strokeWidth="2"/></svg>
    ),
    collections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="7" height="7" stroke="currentColor" strokeWidth="2"/><rect x="14" y="4" width="7" height="7" stroke="currentColor" strokeWidth="2"/><rect x="3" y="15" width="7" height="7" stroke="currentColor" strokeWidth="2"/><rect x="14" y="15" width="7" height="7" stroke="currentColor" strokeWidth="2"/></svg>
    ),
    tokens: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><circle cx="16" cy="12" r="4" stroke="currentColor" strokeWidth="2"/></svg>
    ),
    swap: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 10h8l-2-2m2 6H7l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    ),
    drops: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11z" stroke="currentColor" strokeWidth="2"/></svg>
    ),
    activity: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 12h4l2-7 4 14 2-7h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    ),
    rewards: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l3 6 6 .5-4.5 4 1.5 6-6-3-6 3 1.5-6L3 8.5 9 8l3-6z" stroke="currentColor" strokeWidth="2"/></svg>
    ),
    studio: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v16H4zM8 8h8v8H8z" stroke="currentColor" strokeWidth="2"/></svg>
    ),
    profile: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 20c2.5-4 13.5-4 16 0" stroke="currentColor" strokeWidth="2"/></svg>
    ),
    resources: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 4h10l4 4v12H5z" stroke="currentColor" strokeWidth="2"/><path d="M9 4v4h10" stroke="currentColor" strokeWidth="2"/></svg>
    ),
    settings: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" stroke="currentColor" strokeWidth="2"/><path d="M2 12h3M19 12h3M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" stroke="currentColor" strokeWidth="2"/></svg>
    ),
    support: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 22a9 9 0 1 0-9-9h3a6 6 0 1 1 6 6v3z" stroke="currentColor" strokeWidth="2"/></svg>
    ),
  };
  const primary = [
    { key: "discover", label: "Discover", active: true },
    { key: "collections", label: "Collections" },
    { key: "tokens", label: "Tokens" },
    { key: "swap", label: "Swap" },
    { key: "drops", label: "Drops" },
    { key: "activity", label: "Activity" },
    { key: "rewards", label: "Rewards" },
    { key: "studio", label: "Studio" },
    { key: "profile", label: "Profile" },
  ];
  const secondary = [
    { key: "resources", label: "Resources" },
    { key: "settings", label: "Settings" },
    { key: "support", label: "Support" },
  ];

  return (
    <aside className="sidebar">
      <div className="brand-row">
        <button className="logo-btn" onClick={onToggle} aria-label="Toggle sidebar" aria-expanded={expanded}>
          <span className="logo" />
        </button>
        {expanded && <span className="brand-text">OpenBay</span>}
      </div>
      <div className="group">
        {primary.map((item) => (
          <NavItem key={item.key} icon={icons[item.key]} label={item.label} active={item.active} />
        ))}
      </div>
      <div className="group">
        {secondary.map((item) => (
          <NavItem key={item.key} icon={icons[item.key]} label={item.label} />
        ))}
      </div>
    </aside>
  );
}