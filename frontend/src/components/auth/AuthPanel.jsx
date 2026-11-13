import { BookIcon, GraduationCapIcon, LightbulbIcon, MapPinIcon } from "../icons";
import "./AuthPanel.css";

/**
 * Panneau teal de gauche des pages d'authentification (maquette Synapse).
 *
 * Images : les fichiers ne sont pas encore fournis. Chaque image est remplacée
 * par un emplacement vide (.auth-panel__slot) ; voir src/assets/README.md.
 */
export default function AuthPanel() {
  return (
    <header className="auth-panel">
      <span className="auth-panel__circle auth-panel__circle--top" aria-hidden="true" />
      <span
        className="auth-panel__circle auth-panel__circle--bottom"
        aria-hidden="true"
      />
      <LightbulbIcon className="auth-panel__deco auth-panel__deco--bulb" />
      <BookIcon className="auth-panel__deco auth-panel__deco--book" />

      <div className="auth-panel__content">
        {/* Emplacement : logo Synapse (src/assets/logo-synapse.png) */}
        <div
          className="auth-panel__slot auth-panel__slot--logo"
          role="img"
          aria-label="Synapse"
        />

        <p className="auth-panel__tagline">
          Toute la vie du <em className="auth-panel__highlight">campus</em>, au même
          endroit.
        </p>
        <p className="auth-panel__text">
          Découvrez les événements, inscrivez-vous en un clic et posez vos questions à
          Campus AI.
        </p>

        <p className="auth-panel__tag">
          <GraduationCapIcon />
          <span>Campus FPK</span>
        </p>

        <figure className="auth-panel__photo">
          {/* Emplacement : photo du campus (src/assets/campus-fpk.jpg) */}
          <div
            className="auth-panel__slot auth-panel__slot--photo"
            aria-hidden="true"
          />
          <figcaption className="auth-panel__caption">
            <MapPinIcon />
            <span>Campus FPK</span>
          </figcaption>
        </figure>

        <div className="auth-panel__partners" aria-hidden="true">
          {/* Emplacements : logos partenaires (src/assets/logo-fpk.png, logo-usms.png) */}
          <div className="auth-panel__slot auth-panel__slot--partner" />
          <div className="auth-panel__slot auth-panel__slot--partner" />
        </div>
      </div>
    </header>
  );
}
