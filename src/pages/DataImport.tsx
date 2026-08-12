import { useCallback, useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import { api, type ImportProposal, type FileExtractionResult, type ImportCommitResult } from '../lib/api';

type Stage = 'select' | 'parsing' | 'preview' | 'committing' | 'done';

const ACCEPTED = '.pdf,.docx,.jpg,.jpeg,.png,.webp,.csv,.tsv,.txt';

function fileIcon(name: string) {
  const lower = name.toLowerCase();
  if (/\.(jpe?g|png|webp)$/.test(lower)) return ImageIcon;
  if (lower.endsWith('.pdf') || lower.endsWith('.docx')) return FileText;
  return FileIcon;
}

export default function DataImport() {
  const [stage, setStage] = useState<Stage>('select');
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileResults, setFileResults] = useState<FileExtractionResult[]>([]);
  const [proposal, setProposal] = useState<ImportProposal | null>(null);
  const [commitResult, setCommitResult] = useState<ImportCommitResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    setFiles((prev) => [...prev, ...Array.from(newFiles)]);
  }, []);

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleParse = async () => {
    if (files.length === 0) return;
    setStage('parsing');
    setError(null);
    try {
      const { proposal: p, fileResults: fr } = await api.parseDataImport(files);
      setProposal(p);
      setFileResults(fr);
      setStage('preview');
    } catch (err) {
      setError((err as Error).message);
      setStage('select');
    }
  };

  const handleCommit = async () => {
    if (!proposal) return;
    setStage('committing');
    setError(null);
    try {
      const result = await api.commitDataImport(proposal);
      setCommitResult(result);
      setStage('done');
    } catch (err) {
      setError((err as Error).message);
      setStage('preview');
    }
  };

  const startOver = () => {
    setFiles([]);
    setFileResults([]);
    setProposal(null);
    setCommitResult(null);
    setError(null);
    setStage('select');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold font-heading text-foreground flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-primary" />
          Import Data
        </h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Upload real or sample business documents — customer lists, invoices, support logs, even a
          screenshot — and the AI reads them, structures the data, and seeds your dashboard. No terminal
          needed.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {(stage === 'select' || stage === 'parsing') && (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`bg-background-card border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-border-strong'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
            <UploadCloud className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Drag files here, or click to browse</p>
            <p className="text-xs text-foreground-secondary">PDF, Word (.docx), JPEG/PNG, CSV/TSV/TXT — up to 10 files, 15MB each</p>
          </div>

          {files.length > 0 && (
            <div className="bg-background-card border border-border rounded-xl p-4 space-y-2">
              {files.map((f, i) => {
                const Icon = fileIcon(f.name);
                return (
                  <div key={i} className="flex items-center justify-between bg-muted/50 border border-border rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 text-foreground-secondary shrink-0" />
                      <span className="text-sm text-foreground truncate">{f.name}</span>
                      <span className="text-xs text-foreground-secondary shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-foreground-secondary hover:text-destructive cursor-pointer shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              <div className="flex justify-end pt-2">
                <Button variant="primary" onClick={handleParse} disabled={stage === 'parsing'}>
                  {stage === 'parsing' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Reading documents…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Parse {files.length} file{files.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {stage === 'preview' && proposal && (
        <div className="space-y-4">
          <div className="bg-background-card border border-border rounded-xl p-4">
            <p className="text-xs font-medium text-foreground-secondary mb-1">What the AI found</p>
            <p className="text-sm text-foreground">{proposal.summary}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {fileResults.map((f, i) => (
                <Badge
                  key={i}
                  label={f.error ? `${f.filename}: failed` : `${f.filename}: ${f.charactersExtracted.toLocaleString()} chars`}
                  variant={f.error ? 'critical' : 'success'}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-background-card border border-border rounded-xl p-4">
              <p className="text-xs text-foreground-secondary">Customers found</p>
              <p className="text-2xl font-semibold font-heading text-foreground">{proposal.customers.length}</p>
            </div>
            <div className="bg-background-card border border-border rounded-xl p-4">
              <p className="text-xs text-foreground-secondary">Purchases found</p>
              <p className="text-2xl font-semibold font-heading text-foreground">{proposal.purchases.length}</p>
            </div>
            <div className="bg-background-card border border-border rounded-xl p-4">
              <p className="text-xs text-foreground-secondary">Tickets found</p>
              <p className="text-2xl font-semibold font-heading text-foreground">{proposal.tickets.length}</p>
            </div>
          </div>

          {proposal.customers.length > 0 && (
            <div className="bg-background-card border border-border rounded-xl p-4 overflow-x-auto">
              <p className="text-xs font-medium text-foreground-secondary mb-2">Customers to create or match</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-foreground-secondary border-b border-border">
                    <th className="pb-2 pr-4">Company</th>
                    <th className="pb-2 pr-4">Contact</th>
                    <th className="pb-2 pr-4">Tier</th>
                    <th className="pb-2 pr-4">Annual Value</th>
                    <th className="pb-2">Value Score</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.customers.map((c, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 text-foreground font-medium">{c.company}</td>
                      <td className="py-2 pr-4 text-foreground-secondary">{c.contact_name || '—'}</td>
                      <td className="py-2 pr-4"><Badge label={c.tier} variant="neutral" /></td>
                      <td className="py-2 pr-4 text-foreground-secondary">${c.annual_value.toLocaleString()}</td>
                      <td className="py-2 text-foreground-secondary">{c.value_score}/100</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={startOver}>
              Start Over
            </Button>
            <Button variant="primary" onClick={handleCommit} disabled={stage === 'committing'}>
              {stage === 'committing' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Importing…
                </>
              ) : (
                <>
                  Import to Dashboard <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {stage === 'done' && commitResult && (
        <div className="space-y-4">
          <div className="bg-success/10 border border-success/30 rounded-xl p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3" />
            <p className="text-sm font-semibold font-heading text-foreground mb-1">Import complete</p>
            <p className="text-sm text-foreground-secondary">
              {commitResult.customersCreated} new customer{commitResult.customersCreated === 1 ? '' : 's'} created
              {commitResult.customersMatched > 0 && `, ${commitResult.customersMatched} matched to existing accounts`},{' '}
              {commitResult.purchasesCreated} purchase{commitResult.purchasesCreated === 1 ? '' : 's'} and{' '}
              {commitResult.ticketsCreated} ticket{commitResult.ticketsCreated === 1 ? '' : 's'} added.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" onClick={startOver}>
              Import More
            </Button>
            <Link to="/">
              <Button variant="primary">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {stage !== 'select' && stage !== 'parsing' && (
        <div className="bg-background-card border border-border rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-foreground-secondary">
            The AI infers missing fields (tier, value score, sentiment) from context — review the preview
            above before importing if the source data matters to you. Customers are matched by company
            name, so re-importing the same document won't create duplicates.
          </p>
        </div>
      )}
    </div>
  );
}
