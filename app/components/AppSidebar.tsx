export type AppView = "dashboard" | "matches" | "leaderboard";

type Props = {
  activeView: AppView;
  editing: boolean;
  dirty: boolean;
  onNavigate: (view: AppView) => void;
  onEdit: () => void;
};

const navigation: Array<{ view: AppView; icon: string; label: string }> = [
  { view: "dashboard", icon: "▦", label: "Dashboard" },
  { view: "matches", icon: "⚔", label: "Maçlar" },
  { view: "leaderboard", icon: "♛", label: "Sıralama" },
];

export function AppSidebar({ activeView, editing, dirty, onNavigate, onEdit }: Props) {
  return (
    <aside className="app-sidebar" aria-label="Ana menü">
      <a className="sidebar-brand" href="#dashboard" onClick={() => onNavigate("dashboard")} aria-label="53 Dashboard">
        <span>53</span>
      </a>

      <nav>
        {navigation.map((item) => (
          <a
            key={item.view}
            href={`#${item.view}`}
            className={activeView === item.view ? "active" : ""}
            aria-current={activeView === item.view ? "page" : undefined}
            onClick={() => onNavigate(item.view)}
          >
            <i aria-hidden="true">{item.icon}</i>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <button className={`sidebar-edit ${editing ? "is-editing" : ""}`} onClick={onEdit}>
        <i aria-hidden="true">{editing ? "●" : "✦"}</i>
        <span>{editing ? (dirty ? "Değişiklik var" : "Düzenleniyor") : "Düzenle"}</span>
      </button>
    </aside>
  );
}
