import { useEffect, useState } from "react";

const LayersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

/**
 * Save as Template dialog — captures a name and optional description.
 * The complete pipeline configuration (agents, order, connections, tools,
 * prompts) is assembled by Home and sent with these fields.
 */
export default function SaveTemplateDialog({ open, saving, onClose, onSave }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Template name must be at least 2 characters long.");
      return;
    }

    setError(null);
    try {
      await onSave({ name: trimmedName, description: description.trim() });
    } catch (saveError) {
      setError(
        saveError.response?.data?.message ||
          saveError.message ||
          "Could not save the template."
      );
    }
  };

  return (
    <div
      className="save-dialog-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="save-dialog" role="dialog" aria-modal="true" aria-label="Save as Template">
        <div className="save-dialog-head">
          <div className="save-dialog-icon">
            <LayersIcon />
          </div>
          <div>
            <h2 className="save-dialog-title">Save as Template</h2>
            <p className="save-dialog-sub">
              Stores the full pipeline configuration — agents, order, dependency
              connections, tools and prompts — so you can run it again with a
              different input.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="template-name">Template name</label>
            <input
              id="template-name"
              className="form-input"
              value={name}
              maxLength={80}
              placeholder="e.g. Market Analysis Pipeline"
              autoFocus
              disabled={saving}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="template-description">
              Description <span className="save-dialog-optional">(optional)</span>
            </label>
            <textarea
              id="template-description"
              className="form-textarea"
              rows={3}
              maxLength={500}
              value={description}
              placeholder="What is this pipeline for?"
              disabled={saving}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          {error && <div className="builder-message error">{error}</div>}

          <div className="save-dialog-actions">
            <button
              type="button"
              className="save-dialog-cancel"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="template-use-btn save-dialog-submit" disabled={saving}>
              <LayersIcon />
              {saving ? "Saving…" : "Save Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
