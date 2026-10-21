import { Outlet, NavLink, useNavigate } from "react-router";

import { useAuth } from "../../features/auth/hooks/useAuth";

const NAV_ITEMS = [
  { to: "/orders", label: "Orders", end: true },
  { to: "/orders/new", label: "Create order" },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-logo" aria-hidden="true">OC</span>
          <span>Orders Console</span>
        </div>
        <nav className="app-nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : false}
              className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-user">
          <span className="app-user-name">{user?.name}</span>
          <span className={`role-tag role-tag--${user?.role.toLowerCase()}`}>{user?.role}</span>
          <button type="button" className="button button--ghost" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
