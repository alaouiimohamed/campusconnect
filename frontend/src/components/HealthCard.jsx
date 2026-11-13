import { useEffect, useState } from "react";
import { getHealth } from "../services/api";
import "./HealthCard.css";

const MESSAGES = {
  loading: "Vérification de l'API…",
  ok: "ok",
};

function errorMessage(error) {
  if (error?.isNetworkError) {
    return "Backend injoignable. Vérifiez que le serveur Django est lancé.";
  }
  return `Le backend répond mais signale un problème (HTTP ${error?.status ?? "?"}).`;
}

export default function HealthCard() {
  const [state, setState] = useState({ status: "loading", message: MESSAGES.loading });

  useEffect(() => {
    const controller = new AbortController();

    getHealth({ signal: controller.signal })
      .then((data) => {
        if (data?.status === "ok") {
          setState({ status: "ok", message: MESSAGES.ok });
        } else {
          setState({ status: "error", message: "Réponse inattendue du backend." });
        }
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setState({ status: "error", message: errorMessage(error) });
      });

    return () => controller.abort();
  }, []);

  return (
    <section className="health-card" aria-labelledby="health-card-title">
      <h2 id="health-card-title" className="health-card__title">
        État de l'API
      </h2>
      <p
        className={`health-card__status health-card__status--${state.status}`}
        role="status"
        aria-live="polite"
        data-status={state.status}
      >
        <span className="health-card__dot" aria-hidden="true" />
        <span>{state.message}</span>
      </p>
    </section>
  );
}
