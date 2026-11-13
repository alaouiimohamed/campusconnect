import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "../icons";
import "./FormField.css";

/**
 * Champ de formulaire accessible :
 * - étiquette toujours visible, reliée au champ ;
 * - erreur écrite « Erreur : … », reliée par aria-describedby,
 *   et signalée par une bordure épaisse (pas seulement par la couleur) ;
 * - `revealable` ajoute un bouton œil pour afficher/masquer un mot de passe.
 */
export default function FormField({
  id,
  name,
  label,
  type = "text",
  icon: IconComponent,
  error,
  revealable = false,
  revealLabel = "le mot de passe",
  ...inputProps
}) {
  const [revealed, setRevealed] = useState(false);
  const errorId = `${id}-error`;
  const inputType = revealable && revealed ? "text" : type;

  return (
    <div className={error ? "field field--error" : "field"}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        {IconComponent && <IconComponent className="field__icon" />}
        <input
          id={id}
          name={name}
          type={inputType}
          className="field__input"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        {revealable && (
          <button
            type="button"
            className="field__reveal"
            onClick={() => setRevealed((value) => !value)}
            aria-label={`${revealed ? "Masquer" : "Afficher"} ${revealLabel}`}
            aria-controls={id}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="field__error">
          Erreur : {error}
        </p>
      )}
    </div>
  );
}
