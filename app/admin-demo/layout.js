export default function AdminDemoLayout({ children }) {
  return (
    <>
      <nav style={styles.nav} aria-label="Super Admin AI profile workspace">
        <div style={styles.inner}>
          <b style={styles.brand}>Super Admin AI Workspace</b>
          <div style={styles.tabs}>
            <a href="/admin-demo" style={styles.tab}>Control Center</a>
            <a href="/admin-demo/profiles" style={styles.tab}>Edit AI Profiles</a>
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}

const styles = {
  nav: { borderBottom: "1px solid #eadde1", background: "#fff", position: "sticky", top: 0, zIndex: 20 },
  inner: { maxWidth: 1320, margin: "0 auto", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" },
  brand: { color: "#741f39", fontSize: 14 },
  tabs: { display: "flex", gap: 8, flexWrap: "wrap" },
  tab: { display: "inline-block", padding: "8px 11px", border: "1px solid #d9c9ce", borderRadius: 9, color: "#741f39", textDecoration: "none", fontWeight: 700, background: "#fff" },
};
