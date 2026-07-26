import { useEffect } from "react";

type Props = {
  open: boolean;
  password: string;
  error: string;
  loading: boolean;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function UnlockModal({ open, password, error, loading, onPasswordChange, onClose, onSubmit }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !loading) onClose();
    }}>
      <section className="unlock-modal" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
        <button className="modal-close" onClick={onClose} disabled={loading} aria-label="Kapat">×</button>
        <span className="modal-rune" aria-hidden="true">53</span>
        <h2 id="unlock-title">Şifre</h2>
        <form onSubmit={onSubmit}>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            aria-label="Düzenleme şifresi"
            aria-invalid={Boolean(error)}
          />
          {error && <small className="field-error">{error}</small>}
          <button className="game-button" disabled={!password || loading}>{loading ? "Açılıyor…" : "Aç"}</button>
        </form>
      </section>
    </div>
  );
}
