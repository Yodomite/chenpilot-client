'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clipboard,
  FlaskConical,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ChatLayout } from '@/components/layout/ChatLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import apiService from '@/services/api';
import { useAppSelector } from '@/store';
import { PromptVersion, PromptVersionRecord } from '@/types';

const DEFAULT_TEST_INPUT = 'Help a user move idle USDC into the highest-yield low-risk strategy.';
const DEFAULT_VARIABLES = JSON.stringify(
  {
    agentName: 'ChenPilot',
    userName: 'Ada',
    network: 'mainnet',
    riskLevel: 'low',
    tone: 'clear and confident'
  },
  null,
  2
);

function isRecord(value: unknown): value is PromptVersionRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function extractVersionRecords(payload: unknown): PromptVersionRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const directCollections = [
    payload.versions,
    payload.data,
    payload.items,
    payload.results
  ];

  for (const candidate of directCollections) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }

  if (isRecord(payload.data)) {
    const nestedCollections = [
      payload.data.versions,
      payload.data.items,
      payload.data.results
    ];

    for (const candidate of nestedCollections) {
      if (Array.isArray(candidate)) {
        return candidate.filter(isRecord);
      }
    }
  }

  return [];
}

function getTemplate(record: PromptVersionRecord): string {
  return (
    getString(record.template) ??
    getString(record.prompt) ??
    getString(record.systemPrompt) ??
    getString(record.content) ??
    getString(record.body) ??
    getString(record.text) ??
    ''
  );
}

function getLabel(record: PromptVersionRecord, fallbackIndex: number): string {
  return (
    getString(record.name) ??
    getString(record.title) ??
    getString(record.label) ??
    getString(record.version) ??
    `Template ${fallbackIndex + 1}`
  );
}

function normalizeVersion(record: PromptVersionRecord, index: number): PromptVersion {
  const id =
    getString(record.id) ??
    getString(record._id) ??
    getString(record.uuid) ??
    `version-${index + 1}`;

  const rawTags = getArray(record.tags);
  const tags = rawTags
    .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
    .filter(Boolean);

  const activeFlag =
    getBoolean(record.isActive) ??
    getBoolean(record.active) ??
    getBoolean(record.is_active) ??
    (getString(record.status)?.toLowerCase() === 'active');

  return {
    id,
    label: getLabel(record, index),
    description:
      getString(record.description) ??
      getString(record.summary) ??
      getString(record.notes) ??
      'No description provided for this prompt version.',
    template: getTemplate(record),
    version: getString(record.version) ?? id,
    isActive: Boolean(activeFlag),
    createdAt:
      getString(record.createdAt) ??
      getString(record.created_at) ??
      getString(record.insertedAt) ??
      null,
    updatedAt:
      getString(record.updatedAt) ??
      getString(record.updated_at) ??
      getString(record.modifiedAt) ??
      null,
    tags,
    raw: record
  };
}

function safelyFormatDate(value: string | null): string {
  if (!value) {
    return 'Unknown';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function parseVariables(rawValue: string): { parsed: Record<string, string>; error: string | null } {
  try {
    const value = JSON.parse(rawValue) as unknown;

    if (!isRecord(value)) {
      return { parsed: {}, error: 'Variables must be a JSON object.' };
    }

    const flattened = Object.entries(value).reduce<Record<string, string>>((accumulator, [key, entry]) => {
      if (entry === null || entry === undefined) {
        accumulator[key] = '';
      } else if (typeof entry === 'string') {
        accumulator[key] = entry;
      } else {
        accumulator[key] = JSON.stringify(entry);
      }

      return accumulator;
    }, {});

    return { parsed: flattened, error: null };
  } catch {
    return { parsed: {}, error: 'Variables JSON is invalid.' };
  }
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template
    .replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key: string) => variables[key] ?? match)
    .replace(/\$\{\s*([a-zA-Z0-9_.-]+)\s*\}/g, (match, key: string) => variables[key] ?? match);
}

function getPlaceholders(template: string): string[] {
  const placeholderMatches = template.match(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}|\$\{\s*([a-zA-Z0-9_.-]+)\s*\}/g) ?? [];
  const normalized = placeholderMatches.map((placeholder) =>
    placeholder.replace(/^\{\{\s*|\s*\}\}$|^\$\{\s*|\s*\}$/g, '')
  );

  return Array.from(new Set(normalized));
}

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied`);
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testInput, setTestInput] = useState(DEFAULT_TEST_INPUT);
  const [variablesText, setVariablesText] = useState(DEFAULT_VARIABLES);

  const loadVersions = async (showRefreshState = false) => {
    if (showRefreshState) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      setError(null);
      const response = await apiService.getPromptVersions();
      const normalizedVersions = extractVersionRecords(response).map(normalizeVersion);

      setVersions(normalizedVersions);
      setSelectedId((currentSelectedId) => {
        if (currentSelectedId && normalizedVersions.some((version) => version.id === currentSelectedId)) {
          return currentSelectedId;
        }

        return normalizedVersions.find((version) => version.isActive)?.id ?? normalizedVersions[0]?.id ?? null;
      });
    } catch (requestError: unknown) {
      const message =
        requestError instanceof Error ? requestError.message : 'Failed to load prompt versions.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    void loadVersions();
  }, [isAuthenticated, router]);

  const selectedVersion = useMemo(
    () => versions.find((version) => version.id === selectedId) ?? versions[0] ?? null,
    [selectedId, versions]
  );

  const activeVersion = useMemo(
    () => versions.find((version) => version.isActive) ?? null,
    [versions]
  );

  const parsedVariables = useMemo(() => {
    const { parsed, error: parseError } = parseVariables(variablesText);

    return {
      variables: {
        ...parsed,
        input: testInput,
        userInput: testInput,
        user_query: testInput
      },
      error: parseError
    };
  }, [testInput, variablesText]);

  const renderedPrompt = useMemo(() => {
    if (!selectedVersion) {
      return '';
    }

    return renderTemplate(selectedVersion.template, parsedVariables.variables);
  }, [parsedVariables.variables, selectedVersion]);

  const unresolvedPlaceholders = useMemo(() => {
    if (!selectedVersion) {
      return [];
    }

    return getPlaceholders(selectedVersion.template).filter(
      (placeholder) => parsedVariables.variables[placeholder] === undefined
    );
  }, [parsedVariables.variables, selectedVersion]);

  const handleActivate = async () => {
    if (!selectedVersion || selectedVersion.isActive) {
      return;
    }

    setIsActivating(true);

    try {
      await apiService.activatePromptVersion(selectedVersion.id);
      setVersions((currentVersions) =>
        currentVersions.map((version) => ({
          ...version,
          isActive: version.id === selectedVersion.id
        }))
      );
      toast.success(`${selectedVersion.label} is now active`);
    } catch (requestError: unknown) {
      const message =
        requestError instanceof Error ? requestError.message : 'Failed to activate the selected version.';
      toast.error(message);
    } finally {
      setIsActivating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060816] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-400" />
          <p className="mt-4 text-sm text-slate-300">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <ChatLayout>
      <div className="relative h-full overflow-auto bg-[#060816] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_30%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_25%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,1))]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />

        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/20">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-cyan-200">
                  <ShieldLine />
                  Prompt Version Control
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Agent prompt management dashboard
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
                  Review every available prompt version, simulate template output with sample variables, and promote the best version without leaving the admin workspace.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => void loadVersions(true)}
                  loading={isRefreshing}
                  className="border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Versions
                </Button>
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  <div className="font-medium">Signed in as</div>
                  <div className="text-emerald-50/90">{user?.email ?? 'Administrator'}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Card className="border-white/10 bg-slate-950/75 text-white shadow-lg shadow-slate-950/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Available versions</p>
                  <p className="mt-2 text-3xl font-semibold">{versions.length}</p>
                </div>
                <Bot className="h-8 w-8 text-cyan-300" />
              </div>
            </Card>
            <Card className="border-white/10 bg-slate-950/75 text-white shadow-lg shadow-slate-950/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Active version</p>
                  <p className="mt-2 text-lg font-semibold text-emerald-300">
                    {activeVersion?.label ?? 'No active version'}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />
              </div>
            </Card>
            <Card className="border-white/10 bg-slate-950/75 text-white shadow-lg shadow-slate-950/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Simulation status</p>
                  <p className="mt-2 text-lg font-semibold text-amber-200">
                    {parsedVariables.error
                      ? 'Fix variables JSON'
                      : unresolvedPlaceholders.length > 0
                        ? `${unresolvedPlaceholders.length} placeholder${unresolvedPlaceholders.length === 1 ? '' : 's'} missing`
                        : 'Ready to test'}
                  </p>
                </div>
                <FlaskConical className="h-8 w-8 text-amber-200" />
              </div>
            </Card>
          </section>

          {error && (
            <section className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-300" />
                <div>
                  <p className="font-medium">The versions API could not be loaded.</p>
                  <p className="mt-1 text-red-100/80">{error}</p>
                </div>
              </div>
            </section>
          )}

          <section className="grid gap-6 xl:grid-cols-[1.05fr_1.45fr]">
            <Card
              title="Version Library"
              subtitle="Loaded from GET /versions"
              className="border-white/10 bg-slate-950/75 text-white shadow-xl shadow-slate-950/40"
            >
              {isLoading ? (
                <div className="flex min-h-64 items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-300" />
                    <p className="mt-3 text-sm text-slate-400">Fetching prompt versions...</p>
                  </div>
                </div>
              ) : versions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                  No prompt versions were returned by the API.
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((version) => {
                    const isSelected = version.id === selectedVersion?.id;

                    return (
                      <button
                        key={version.id}
                        type="button"
                        onClick={() => setSelectedId(version.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? 'border-cyan-400/60 bg-cyan-400/10 shadow-lg shadow-cyan-950/30'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-base font-semibold text-white">{version.label}</p>
                              {version.isActive && (
                                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-emerald-200">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm text-slate-300">{version.description}</p>
                          </div>
                          <Sparkles className={`h-5 w-5 shrink-0 ${isSelected ? 'text-cyan-200' : 'text-slate-500'}`} />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2 py-1">
                            {version.version}
                          </span>
                          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2 py-1">
                            Updated {safelyFormatDate(version.updatedAt)}
                          </span>
                          {version.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-cyan-100"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

            <div className="space-y-6">
              <Card
                title={selectedVersion?.label ?? 'Prompt details'}
                subtitle={selectedVersion ? `Selected version ID: ${selectedVersion.id}` : 'Choose a version from the library'}
                className="border-white/10 bg-slate-950/75 text-white shadow-xl shadow-slate-950/40"
                actions={
                  selectedVersion ? (
                    <Button
                      onClick={() => void handleActivate()}
                      disabled={selectedVersion.isActive}
                      loading={isActivating}
                      className={`${
                        selectedVersion.isActive
                          ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/20'
                          : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                      }`}
                    >
                      {selectedVersion.isActive ? 'Currently Active' : 'Activate Version'}
                    </Button>
                  ) : undefined
                }
              >
                {selectedVersion ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Created</p>
                        <p className="mt-2 text-sm text-white">{safelyFormatDate(selectedVersion.createdAt)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Updated</p>
                        <p className="mt-2 text-sm text-white">{safelyFormatDate(selectedVersion.updatedAt)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Source endpoint</p>
                        <p className="mt-2 text-sm text-white">PATCH /versions/{selectedVersion.id}/activate</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-white">Description</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{selectedVersion.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => copyText(selectedVersion.template, 'Template')}
                          className="border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                        >
                          <Clipboard className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                      <div className="mb-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-white">Template source</p>
                          <p className="text-xs text-slate-400">Original prompt body from the selected version.</p>
                        </div>
                        <span className="text-xs text-slate-500">{selectedVersion.template.length} chars</span>
                      </div>
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-sm leading-6 text-cyan-50">
                        {selectedVersion.template || 'No template body found on this version.'}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                    Select a prompt version to inspect details and activate it.
                  </div>
                )}
              </Card>

              <Card
                title="Template Simulator"
                subtitle="Use local substitutions to test how the selected template renders before activating it"
                className="border-white/10 bg-slate-950/75 text-white shadow-xl shadow-slate-950/40"
              >
                {selectedVersion ? (
                  <div className="space-y-5">
                    <div className="grid gap-5 lg:grid-cols-2">
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-200">Sample user input</label>
                        <textarea
                          value={testInput}
                          onChange={(event) => setTestInput(event.target.value)}
                          rows={6}
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60"
                          placeholder="Enter a user request to simulate template interpolation"
                        />
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
                          Available aliases injected automatically: `input`, `userInput`, `user_query`.
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-200">Variables JSON</label>
                        <textarea
                          value={variablesText}
                          onChange={(event) => setVariablesText(event.target.value)}
                          rows={6}
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-cyan-400/60"
                          placeholder='{"agentName":"ChenPilot"}'
                        />
                        {parsedVariables.error ? (
                          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">
                            {parsedVariables.error}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                            Variables parsed successfully.
                          </div>
                        )}
                      </div>
                    </div>

                    {unresolvedPlaceholders.length > 0 && (
                      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                        <div className="flex items-start gap-3">
                          <Wand2 className="mt-0.5 h-5 w-5 text-amber-200" />
                          <div>
                            <p className="font-medium">Some placeholders are still unresolved.</p>
                            <p className="mt-1 text-amber-100/80">{unresolvedPlaceholders.join(', ')}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                      <div className="mb-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-white">Rendered prompt preview</p>
                          <p className="text-xs text-slate-400">Local preview based on the selected version and the values above.</p>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => copyText(renderedPrompt, 'Rendered prompt')}
                          className="border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                        >
                          <Clipboard className="mr-2 h-4 w-4" />
                          Copy Preview
                        </Button>
                      </div>
                      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-100">
                        {renderedPrompt || 'No rendered output yet.'}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                    Choose a version to start testing template output.
                  </div>
                )}
              </Card>
            </div>
          </section>
        </div>
      </div>
    </ChatLayout>
  );
}

function ShieldLine() {
  return <span className="inline-block h-2 w-2 rounded-full bg-cyan-300" />;
}
