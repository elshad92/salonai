import { Link } from "react-router-dom";

export default function Landing() {
  const features = [
    {
      title: "Smart Scheduling",
      text: "Reduce no-shows and fill open slots automatically.",
    },
    {
      title: "Revenue Insights",
      text: "Understand demand and optimize services in real time.",
    },
    {
      title: "Client Retention",
      text: "Use AI nudges to bring clients back consistently.",
    },
    {
      title: "AI Concierge",
      text: "Get proactive recommendations every morning.",
    },
  ];

  const plans = [
    { name: "Solo", price: 19, description: "For independent stylists managing one chair." },
    { name: "Small", price: 49, description: "For compact salons with a growing team." },
    { name: "Pro", price: 99, description: "For established salons scaling operations.", featured: true },
    { name: "Enterprise", price: 199, description: "For multi-location businesses with custom needs." },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#FFFFFF",
        color: "#111111",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        padding: 32,
      }}
    >
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>SalonAI</h1>
          <nav style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              to="/login"
              style={{
                textDecoration: "none",
                color: "#111",
                border: "1px solid #EAEAEA",
                borderRadius: 999,
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Login
            </Link>
            <Link
              to="/booking"
              style={{
                textDecoration: "none",
                color: "#111",
                border: "1px solid #EAEAEA",
                borderRadius: 999,
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Booking
            </Link>
            <Link
              to="/dashboard"
              style={{
                textDecoration: "none",
                borderRadius: 999,
                border: "1px solid #BFA164",
                background: "#C8A96E",
                color: "#111",
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Dashboard
            </Link>
          </nav>
        </header>

        <section
          style={{
            border: "1px solid #EFEFEF",
            borderRadius: 28,
            background: "linear-gradient(180deg, #FFFFFF 0%, #F9F9F9 100%)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
            padding: 36,
          }}
        >
          <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.2em", color: "#666" }}>
            Beauty operations, reimagined
          </p>
          <h2 style={{ margin: "14px 0 0", fontSize: 54, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            SalonAI software
            <span style={{ display: "block", color: "#444" }}>that feels premium.</span>
          </h2>
          <p style={{ margin: "14px 0 0", maxWidth: 780, color: "#555", fontSize: 18, lineHeight: 1.5 }}>
            Fresha alternative with zero commissions. Built for modern salon teams to predict demand,
            manage staff workload, and deliver seamless booking.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            <Link
              to="/login"
              style={{
                textDecoration: "none",
                borderRadius: 999,
                background: "#111",
                color: "#FFF",
                padding: "12px 18px",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Start with Google
            </Link>
            <Link
              to="/booking"
              style={{
                textDecoration: "none",
                borderRadius: 999,
                border: "1px solid #EAEAEA",
                color: "#111",
                padding: "12px 18px",
                fontSize: 14,
                fontWeight: 500,
                background: "#FFF",
              }}
            >
              Client Booking Demo
            </Link>
          </div>
        </section>

        <section
          style={{
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 14,
          }}
        >
          {features.map((feature) => (
            <article
              key={feature.title}
              style={{
                border: "1px solid #EFEFEF",
                borderRadius: 18,
                padding: 18,
                background: "#FFF",
                boxShadow: "0 8px 24px rgba(17,17,17,0.03)",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{feature.title}</h3>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "#666", lineHeight: 1.5 }}>{feature.text}</p>
            </article>
          ))}
        </section>

        <section style={{ marginTop: 34 }}>
          <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.2em", color: "#666" }}>Pricing</p>
          <h2 style={{ margin: "10px 0 0", fontSize: 38, fontWeight: 700, letterSpacing: "-0.02em" }}>Choose your growth plan.</h2>
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {plans.map((plan) => (
              <article
                key={plan.name}
                style={{
                  border: plan.featured ? "1px solid #111" : "1px solid #EFEFEF",
                  borderRadius: 20,
                  padding: 20,
                  background: plan.featured ? "#111" : "#FFF",
                  color: plan.featured ? "#FFF" : "#111",
                }}
              >
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{plan.name}</h3>
                <p style={{ margin: "12px 0 0", fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em" }}>${plan.price}</p>
                <p style={{ margin: "2px 0 0", fontSize: 14, color: plan.featured ? "#DDD" : "#666" }}>per month</p>
                <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.5, color: plan.featured ? "#EAEAEA" : "#555" }}>
                  {plan.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
