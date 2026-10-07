import { useState } from 'react'
import { usePdfExport } from '@shared/hooks/usePdfExport'
import { DownloadPdfButton } from '@shared/components/DownloadPdfButton'
import { LAST_EMITTED_RUNS, clearEmittedRuns } from '@shared/pdf/fonts'
import StudentLayout from '../layouts/StudentLayout'

const FIXTURE_WORKSPACE = {
  title: 'Dev PDF Testing Workspace',
  researchQuestion: 'Does the PDF engine render tables, Indic scripts, code generics, and ₹ symbols safely?',
}

const FIXTURE_REPORT = {
  title: 'Dev PDF Test Report',
  template: 'ACADEMIC_RESEARCH',
  summary: 'Executive summary test for PDF foundation. Target compensation benchmark: ₹12 LPA — ₹24 LPA.',
  qualityIssues: [
    '1 contradiction detected in primary source telemetry.',
    'Verification required for Indic font rendering (Telugu & Devanagari).',
  ],
  sections: [
    {
      key: 'SEC_1',
      title: '1. Executive Overview',
      content: '# 🚀 Executive R&D Intelligence Summary\n\n## 📊 Overview\nThis report details the **AI-powered career guidance ecosystem**. Benchmark: **₹6 LPA**.',
    },
    {
      key: 'SEC_2',
      title: '2. Performance Metrics',
      content: '| Metric | Q1 Target | Q2 Target |\n| --- | --- | --- |\n| Active Students | 1,000 | 5,000 |\n| Placement Rate | 92% | 98% |',
    },
    {
      key: 'SEC_3',
      title: '3. Code & Math Test',
      content: '```javascript\nif (x < 5 && y > 3) {\n  const config = new Map<String, int>();\n  console.log("Code generics test pass: ₹12 LPA");\n}\n```',
    },
    {
      key: 'SEC_4',
      title: '4. Indic Script & Regional Test',
      content: '- **Telugu**: డ్రీమ్ వేవ్ ఏఐ - కెరీర్ గైడెన్స్ మరియు వచ్చి\u200Cన ప్లాట్‌ఫారమ్\n- **Hindi**: ड्रीम वेव एआई - करियर मार्गदर्शन एवं लर्निंग प्लेटफॉर्म',
    },
    {
      key: 'SEC_5',
      title: '5. Text-Presentation Symbols & Emojis',
      content: '- **Symbols**: ✔ ✓ ✗ ❤ ⚠ ★ ☆ ☑ ☐\n- **Sanitized Checks**: Checks: ✔ ✓ ☑ ☐ ✗ | Ratings: ❤ ⚠ ★ ☆',
    },
  ],
}

const DIAGNOSTIC_FIXTURES = {
  latin: {
    name: 'Latin only',
    workspace: { title: 'Latin Diagnostic Workspace', researchQuestion: 'Latin script and currency symbol test' },
    report: {
      title: 'Latin Test Report',
      summary: 'Dream Wave AI - Career Guidance & Learning Platform. Benchmark: ₹6 LPA — ₹24 LPA.',
      sections: [{ key: 'S1', title: '1. Latin Section', content: 'Plain English with ₹ and a dash — test.' }],
    },
  },
  telugu: {
    name: 'Telugu only',
    workspace: { title: 'Telugu Diagnostic Workspace', researchQuestion: 'Telugu script test' },
    report: {
      title: 'Telugu Test Report',
      summary: '\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D \u0C35\u0C47\u0C35\u0C4D',
      sections: [{ key: 'S1', title: '1. Telugu Section', content: '\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D \u0C35\u0C47\u0C35\u0C4D\n\u0C2A\u0C4D\u0C30\u0C3E\u0C1C\u0C46\u0C15\u0C4D\u0C1F\u0C4D \u0C15\u0C4D\u0C30\u0C2E\u0C02 \u0C36\u0C4D\u0C30\u0C40' }],
    },
  },
  hindi: {
    name: 'Hindi only',
    workspace: { title: 'Hindi Diagnostic Workspace', researchQuestion: 'Hindi script test' },
    report: {
      title: 'Hindi Test Report',
      summary: 'ड्रीम वेव एआई',
      sections: [{ key: 'S1', title: '1. Hindi Section', content: 'ड्रीम वेव एआई - करियर मार्गदर्शन एवं लर्निंग प्लेटफॉर्म' }],
    },
  },
  full: {
    name: 'Full fixture',
    workspace: FIXTURE_WORKSPACE,
    report: FIXTURE_REPORT,
  },
}

export default function DevPdfTestPage() {
  const { exporting, error: pdfError, setError: setPdfError, notice: pdfNotice, setNotice: setPdfNotice, exportPdf } = usePdfExport()
  const [diagnosticData, setDiagnosticData] = useState(null)

  const runDiagnostic = async (key) => {
    clearEmittedRuns()
    const fix = DIAGNOSTIC_FIXTURES[key]
    const fileName = `dev-pdf-test-${key}-${new Date().toISOString().slice(0, 10)}.pdf`

    const docBuilder = async (options = {}) => {
      const { ReportPdf } = await import('./ReportPdf')
      return <ReportPdf workspace={fix.workspace} report={fix.report} options={options} />
    }

    const res = await exportPdf(docBuilder, fileName)
    const emittedRuns = [...LAST_EMITTED_RUNS]

    console.table(emittedRuns)

    const { getGuardStats } = await import('@shared/pdf/fontkitGuard')
    const guardStats = getGuardStats()

    const origStack = res?.originalError?.stack ? res.originalError.stack.split('\n').slice(0, 15) : []
    const safeStack = res?.safeModeError?.stack ? res.safeModeError.stack.split('\n').slice(0, 15) : []

    setDiagnosticData({
      testName: fix.name,
      success: res?.success || false,
      recovered: res?.recovered || false,
      originalErrorMsg: res?.originalError?.message || null,
      originalErrorStack: origStack,
      safeModeErrorMsg: res?.safeModeError?.message || null,
      safeModeErrorStack: safeStack,
      textRuns: emittedRuns,
      registeredFonts: res?.registeredFonts || null,
      guardStats,
    })
  }

  return (
    <StudentLayout>
      <div className="page-header">
        <h1>🧪 Dev PDF Test Suite & Diagnostic Panel</h1>
        <p>Internal test suite for validating client-side PDF export, Indic font rendering, markdown tables, and symbol sanitization.</p>
      </div>

      {pdfError && (
        <div className="alert alert-error" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {pdfError}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPdfError('')}>✕</button>
        </div>
      )}

      {pdfNotice && (
        <div className="alert alert-warning" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>ℹ️ {pdfNotice}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPdfNotice('')}>✕</button>
        </div>
      )}

      {/* Diagnostic Panel Buttons */}
      <div className="card card-purple" style={{ marginBottom: 20 }}>
        <h2>🔬 Run Script Diagnostics</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          Select a script fixture below to test PDF generation and inspect emitted text runs, font family resolution, and error traces.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <DownloadPdfButton onExport={() => runDiagnostic('latin')} loading={exporting} label="🔤 Latin only" />
          <DownloadPdfButton onExport={() => runDiagnostic('telugu')} loading={exporting} label="🪔 Telugu only" />
          <DownloadPdfButton onExport={() => runDiagnostic('hindi')} loading={exporting} label="🕉️ Hindi only" />
          <DownloadPdfButton onExport={() => runDiagnostic('full')} loading={exporting} label="📄 Full fixture" />
        </div>
      </div>

      {/* Diagnostic Results Display */}
      {diagnosticData && (
        <div className="card" style={{ marginBottom: 20, backgroundColor: 'var(--bg-secondary, #1e1b4b)' }}>
          <h3>📊 Diagnostic Result: {diagnosticData.testName}</h3>
          <div style={{ marginBottom: 12 }}>
            <strong>Status: </strong>
            {diagnosticData.success ? (
              diagnosticData.recovered ? (
                <span className="badge badge-warning">RECOVERED (SAFE MODE RETRY)</span>
              ) : (
                <span className="badge badge-success">SUCCESS</span>
              )
            ) : (
              <span className="badge badge-danger">FAILED</span>
            )}
          </div>

          {/* Fontkit Guard Stats */}
          {diagnosticData.guardStats && (
            <div style={{ marginBottom: 16, padding: 10, backgroundColor: 'rgba(59, 130, 246, 0.15)', borderRadius: 6, borderLeft: '4px solid #3b82f6' }}>
              <strong>🛡️ Fontkit Guard Stats: </strong>
              <span>Installed: <code>{String(diagnosticData.guardStats.installed)}</code> | </span>
              <span>Hits (Null Anchors Guarded): <code>{diagnosticData.guardStats.hits}</code> | </span>
              <span>Variant: <code>{diagnosticData.guardStats.variant}</code></span>
            </div>
          )}

          {/* Original Error Trace */}
          {diagnosticData.originalErrorMsg && (
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: 6, borderLeft: '4px solid #ef4444' }}>
              <strong style={{ color: '#f87171' }}>Original Render Error:</strong> {diagnosticData.originalErrorMsg}
              {diagnosticData.originalErrorStack.length > 0 && (
                <pre style={{ fontSize: '0.75rem', marginTop: 8, overflowX: 'auto', color: '#fca5a5' }}>
                  {diagnosticData.originalErrorStack.join('\n')}
                </pre>
              )}
            </div>
          )}

          {/* Safe Mode Error Trace */}
          {diagnosticData.safeModeErrorMsg && (
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: 6, borderLeft: '4px solid #ef4444' }}>
              <strong style={{ color: '#f87171' }}>Safe Mode Retry Error:</strong> {diagnosticData.safeModeErrorMsg}
              {diagnosticData.safeModeErrorStack.length > 0 && (
                <pre style={{ fontSize: '0.75rem', marginTop: 8, overflowX: 'auto', color: '#fca5a5' }}>
                  {diagnosticData.safeModeErrorStack.join('\n')}
                </pre>
              )}
            </div>
          )}

          {/* Registered Fonts */}
          {diagnosticData.registeredFonts && (
            <div style={{ marginBottom: 16 }}>
              <strong>REGISTERED_FONTS:</strong>
              <pre style={{ fontSize: '0.8rem', backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: 8, borderRadius: 4 }}>
                {JSON.stringify(diagnosticData.registeredFonts, null, 2)}
              </pre>
            </div>
          )}

          {/* Text Runs Emitted Table */}
          <div>
            <strong>Emitted Text Runs ({diagnosticData.textRuns.length}):</strong>
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', border: '1px solid var(--border-color, #374151)' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', textAlign: 'left' }}>
                    <th style={{ padding: 6, border: '1px solid #374151' }}>#</th>
                    <th style={{ padding: 6, border: '1px solid #374151' }}>Text</th>
                    <th style={{ padding: 6, border: '1px solid #374151' }}>Script</th>
                    <th style={{ padding: 6, border: '1px solid #374151' }}>Font Family</th>
                    <th style={{ padding: 6, border: '1px solid #374151' }}>Weight</th>
                    <th style={{ padding: 6, border: '1px solid #374151' }}>Style</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnosticData.textRuns.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #374151' }}>
                      <td style={{ padding: 6, border: '1px solid #374151' }}>{i + 1}</td>
                      <td style={{ padding: 6, border: '1px solid #374151' }}>{r.text}</td>
                      <td style={{ padding: 6, border: '1px solid #374151' }}>{r.script}</td>
                      <td style={{ padding: 6, border: '1px solid #374151' }}>{r.fontFamily}</td>
                      <td style={{ padding: 6, border: '1px solid #374151' }}>{r.fontWeight}</td>
                      <td style={{ padding: 6, border: '1px solid #374151' }}>{r.fontStyle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  )
}

