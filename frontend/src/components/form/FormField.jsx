import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "../icons";
import "./FormField.css";

/**
 * Champ de formulaire accessible :
 * - étiquette toujours visible, reliée au champ ;
 * - erreur écrite « Erreur : … », reliée par aria-describedby,
 *   et signalée par une bordure épaisse (pas seulement par la couleur) ;
 * - `hint` affiche une aide sous le champ, reliée elle aussi par aria-describedby ;
 * - `revealable` ajoute un bouton œil pour afficher/masquer un mot de passe.
 */
export default function FormField({
  id,
  name,
  label,
  type = "text",
  icon: IconComponent,
  hint,
  error,
  revealable = false,
  revealLabel = "le mot de passe",
  ...inputProps
}) {
  const [revealed, setRevealed] = useState(false);
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const inputType = revealable && revealed ? "text" : type;
  const describedBy =
    [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

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
          aria-describedby={describedBy}
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
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error">
          Erreur : {error}
        </p>
      )}
    </div>
  );
}
