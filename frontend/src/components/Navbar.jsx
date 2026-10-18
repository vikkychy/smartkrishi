import { ArrowUpRight, Leaf, LogOut, Moon, ShoppingCart, Sun } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link className="brand" to="/" aria-label="Smart Krishi home">
          <span className="brand-mark"><Leaf size={21} strokeWidth={2.4} /></span>
          <span>smart<span className="brand-accent">krishi</span></span>
        </Link>

        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/marketplace">Marketplace</NavLink>
          <NavLink to="/community">Community</NavLink>
          {user?.role === "farmer" && <><NavLink to="/farmer">My farm</NavLink><NavLink to="/harvests">Harvests</NavLink></>}
        </nav>

        <div className="nav-actions">
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          {user ? (
            <>
              {user.role === "buyer" && <Link className="cart-nav-link" to="/cart" aria-label={`Shopping cart with ${count} kilograms of produce`} title="Shopping cart"><ShoppingCart size={19} /><span>Cart</span>{count > 0 && <span className="cart-count">{count}</span>}</Link>}
              <Link className="account-link" to="/account">{user.name.split(" ")[0]}</Link>
              <button className="icon-button" type="button" onClick={handleLogout} aria-label="Log out" title="Log out">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link className="button button-small button-dark" to="/login">
              Get started <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
