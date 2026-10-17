export function DownloadPdfButton({
  onExport,
  loading = false,
  disabled = false,
  disabledReason = '',
  label = '📄 Download PDF',
  loadingLabel = 'Generating PDF…',
  className = 'btn btn-primary btn-sm',
}) {
  const isBlocked = disabled || loading

  return (
    <button
      type="button"
      className={className}
      onClick={onExport}
      disabled={isBlocked}
      title={disabled && disabledReason ? disabledReason : undefined}
      aria-label={disabled && disabledReason ? disabledReason : label}
    >
      {loading ? loadingLabel : label}
    </button>
  )
}

export default DownloadPdfButton
