import campusPhoto from "../../assets/campus-fpk.jpg";
import logoFpk from "../../assets/logo-fpk.png";
import logoSynapseInverse from "../../assets/logo-synapse-inverse.png";
import logoUsms from "../../assets/logo-usms.png";
import {
  BookIcon,
  BriefcaseIcon,
  CheckIcon,
  GraduationCapIcon,
  LightbulbIcon,
  MapPinIcon,
} from "../icons";
import "./AuthPanel.css";

const CAMPUS_TAGLINE = (
  <>
    Toute la vie du <em className="auth-panel__highlight">campus</em>, au même endroit.
  </>
);

const SPACES = {
  etudiant: {
    tagIcon: GraduationCapIcon,
    tag: "Espace étudiant",
    title: CAMPUS_TAGLINE,
    text: "Découvrez les événements, inscrivez-vous en un clic et posez vos questions à Campus AI.",
    points: [
      "Rechercher et filtrer les événements",
      "S'inscrire et se désinscrire en un clic",
      "Recevoir des recommandations personnalisées",
    ],
  },
  organisateur: {
    tagIcon: BriefcaseIcon,
    tag: "Espace organisateur",
    title: "Organisez, publiez et suivez vos événements.",
    text: "Créez vos événements, gérez les inscriptions et suivez vos participants depuis un seul espace.",
    points: [
      "Créer et modifier vos événements",
      "Consulter les inscrits et la liste d'attente",
      "Publication après validation de l'administrateur",
    ],
  },
};

/**
 * Panneau teal de gauche des pages d'authentification (maquette Synapse).
 * `space` : "etudiant" (par défaut) ou "organisateur".
 * Images : versions provisoires, voir src/assets/README.md.
 */
export default function AuthPanel({ space = "etudiant" }) {
  const { tagIcon: TagIcon, tag, title, text, points } = SPACES[space];

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
        <img className="auth-panel__logo" src={logoSynapseInverse} alt="Synapse" />

        <p className="auth-panel__tag">
          <TagIcon />
          <span>{tag}</span>
        </p>

        <p className="auth-panel__tagline">{title}</p>
        <p className="auth-panel__text">{text}</p>

        <ul className="auth-panel__points">
          {points.map((point) => (
            <li key={point} className="auth-panel__point">
              <CheckIcon />
              <span>{point}</span>
            </li>
          ))}
        </ul>

        <figure className="auth-panel__photo">
          <img
            className="auth-panel__photo-img"
            src={campusPhoto}
            alt="Bâtiment de la Faculté polydisciplinaire de Khouribga"
          />
          <figcaption className="auth-panel__caption">
            <MapPinIcon />
            <span>Campus FPK</span>
          </figcaption>
        </figure>

        <div className="auth-panel__partners">
          <img
            className="auth-panel__partner"
            src={logoFpk}
            alt="Faculté polydisciplinaire de Khouribga"
          />
          <img
            className="auth-panel__partner"
            src={logoUsms}
            alt="Université Sultan Moulay Slimane"
          />
        </div>
      </div>
    </header>
  );
}
