"use client";

export function ResignConfirmDialog({
  open,
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}): React.ReactElement | null {
  if (!open) return null;

  return (
    <div className="result-backdrop" role="presentation" onClick={onCancel}>
      <section
        className="result-modal resign-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resign-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Desistência</p>
        <h2 id="resign-dialog-title">Tem certeza que quer desistir?</h2>
        <p className="muted">
          Se confirmar, a partida termina agora e a vitória vai para o adversário.
        </p>
        <div className="action-row">
          <button className="button danger" onClick={onConfirm} disabled={pending}>
            {pending ? "Desistindo…" : "Sim, desistir"}
          </button>
          <button className="button secondary" onClick={onCancel} disabled={pending}>
            Continuar jogando
          </button>
        </div>
      </section>
    </div>
  );
}
