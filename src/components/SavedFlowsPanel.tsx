import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Cloud,
  Copy,
  Download,
  FolderOpen,
  HardDrive,
  Loader2,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import pb, { isPocketBaseConfigured, pocketBaseUrl } from '../lib/pocketbase';
import type { FlowSnapshot, FlowVisibility, SavedFlow } from '../types/flow';
import { buildFlowFromGeneratedRoom } from '../utils/generatedFlow';
import { listGeneratedVenueRooms, type VenueRoomOption } from '../utils/venueImport';

const LOCAL_STORAGE_KEY = 'mjw-puzzle-flow-visualizer.savedFlows.v1';
const DEFAULT_TITLE = 'Untitled Puzzle Flow';

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `flow-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const nowIso = () => new Date().toISOString();

const cloneFlow = (flow: FlowSnapshot): FlowSnapshot => ({
  nodes: JSON.parse(JSON.stringify(flow.nodes ?? [])),
  edges: JSON.parse(JSON.stringify(flow.edges ?? [])),
});

const normalizeVisibility = (value: unknown): FlowVisibility => {
  if (value === 'shared' || value === 'public') return value;
  return 'private';
};

const makeLocalFlow = (flow: FlowSnapshot, title = DEFAULT_TITLE): SavedFlow => {
  const timestamp = nowIso();
  return {
    id: createId(),
    title,
    description: '',
    flow: cloneFlow(flow),
    visibility: 'private',
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    source: 'local',
  };
};

const normalizeLocalFlow = (value: Partial<SavedFlow>): SavedFlow | null => {
  if (!value || !value.flow || !Array.isArray(value.flow.nodes) || !Array.isArray(value.flow.edges)) {
    return null;
  }

  const timestamp = nowIso();
  return {
    id: value.id || createId(),
    cloudId: value.cloudId,
    title: value.title || DEFAULT_TITLE,
    description: value.description || '',
    flow: cloneFlow(value.flow),
    thumbnail: value.thumbnail,
    visibility: normalizeVisibility(value.visibility),
    version: Number.isFinite(value.version) ? Number(value.version) : 1,
    createdAt: value.createdAt || timestamp,
    updatedAt: value.updatedAt || timestamp,
    source: value.source === 'cloud' ? 'cloud' : 'local',
  };
};

const loadLocalFlows = (): SavedFlow[] => {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Partial<SavedFlow>>;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeLocalFlow).filter((flow): flow is SavedFlow => Boolean(flow));
  } catch (error) {
    console.warn('Unable to load local saved flows.', error);
    return [];
  }
};

const saveLocalFlows = (flows: SavedFlow[]) => {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flows));
};

type CloudRecord = {
  id: string;
  title?: string;
  description?: string;
  flow_json?: FlowSnapshot;
  thumbnail?: string;
  visibility?: FlowVisibility;
  version?: number;
  created?: string;
  updated?: string;
};

const cloudRecordToSavedFlow = (record: CloudRecord): SavedFlow => ({
  id: `cloud:${record.id}`,
  cloudId: record.id,
  title: record.title || DEFAULT_TITLE,
  description: record.description || '',
  flow: cloneFlow(record.flow_json || { nodes: [], edges: [] }),
  thumbnail: record.thumbnail,
  visibility: normalizeVisibility(record.visibility),
  version: Number.isFinite(record.version) ? Number(record.version) : 1,
  createdAt: record.created || nowIso(),
  updatedAt: record.updated || nowIso(),
  source: 'cloud',
});

type SavedFlowsPanelProps = {
  currentFlow: FlowSnapshot;
  onLoadFlow: (flow: FlowSnapshot) => void;
};

export default function SavedFlowsPanel({ currentFlow, onLoadFlow }: SavedFlowsPanelProps) {
  const [localFlows, setLocalFlows] = useState<SavedFlow[]>(() => loadLocalFlows());
  const [cloudFlows, setCloudFlows] = useState<SavedFlow[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [activeBaselineUpdatedAt, setActiveBaselineUpdatedAt] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string>('Local-only mode is ready.');
  const [error, setError] = useState<string>('');
  const [isBusy, setIsBusy] = useState(false);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [authRevision, setAuthRevision] = useState(0);
  const [venueRooms, setVenueRooms] = useState<VenueRoomOption[] | null>(null);
  const [isVenueLoading, setIsVenueLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isAuthenticated = Boolean(pb?.authStore.isValid && pb.authStore.record?.id);
  const authUserId = pb?.authStore.record?.id as string | undefined;

  const allFlows = useMemo(() => [...cloudFlows, ...localFlows], [cloudFlows, localFlows]);
  const activeFlow = allFlows.find((flow) => flow.id === activeFlowId) || null;

  useEffect(() => {
    saveLocalFlows(localFlows);
  }, [localFlows]);

  const refreshCloudFlows = useCallback(async () => {
    if (!pb || !isAuthenticated || !authUserId) {
      setCloudFlows([]);
      return;
    }

    setIsCloudLoading(true);
    setError('');
    try {
      const records = await pb.collection('puzzle_flows').getFullList<CloudRecord>({
        sort: '-updated',
        filter: `owner = "${authUserId}"`,
      });
      setCloudFlows(records.map(cloudRecordToSavedFlow));
      setStatus(`Loaded ${records.length} cloud flow${records.length === 1 ? '' : 's'}.`);
    } catch (cloudError) {
      console.error(cloudError);
      setError('Could not load cloud flows. Check the puzzle_flows collection, rules, and VITE_POCKETBASE_URL.');
    } finally {
      setIsCloudLoading(false);
    }
  }, [authUserId, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void refreshCloudFlows();
    }
  }, [authRevision, isAuthenticated, refreshCloudFlows]);

  const upsertLocalFlow = useCallback((flow: SavedFlow) => {
    setLocalFlows((flows) => {
      const exists = flows.some((item) => item.id === flow.id);
      if (exists) {
        return flows.map((item) => (item.id === flow.id ? flow : item));
      }
      return [flow, ...flows];
    });
  }, []);

  const saveCurrentLocal = useCallback(() => {
    const timestamp = nowIso();
    if (activeFlow?.source === 'local') {
      if (activeBaselineUpdatedAt && activeFlow.updatedAt !== activeBaselineUpdatedAt) {
        const shouldOverwrite = window.confirm('This local flow changed after you loaded it. Overwrite the newer saved version with the current canvas?');
        if (!shouldOverwrite) return;
      }
      const nextFlow: SavedFlow = {
        ...activeFlow,
        flow: cloneFlow(currentFlow),
        version: activeFlow.version + 1,
        updatedAt: timestamp,
      };
      upsertLocalFlow(nextFlow);
      setActiveBaselineUpdatedAt(nextFlow.updatedAt);
      setStatus(`Saved “${nextFlow.title}” locally.`);
      return;
    }

    const title = window.prompt('Name this local flow:', activeFlow?.title || DEFAULT_TITLE) || DEFAULT_TITLE;
    const newFlow = makeLocalFlow(currentFlow, title);
    upsertLocalFlow(newFlow);
    setActiveFlowId(newFlow.id);
    setActiveBaselineUpdatedAt(newFlow.updatedAt);
    setStatus(`Created local flow “${newFlow.title}”.`);
  }, [activeBaselineUpdatedAt, activeFlow, currentFlow, upsertLocalFlow]);

  const saveCurrentCloud = useCallback(async () => {
    if (!pb || !isAuthenticated || !authUserId) {
      setError('Sign in with PocketBase before saving to the cloud. Until then, flows are saved locally only.');
      return;
    }

    setIsBusy(true);
    setError('');
    try {
      const timestamp = nowIso();
      const baseTitle = activeFlow?.title || window.prompt('Name this cloud flow:', DEFAULT_TITLE) || DEFAULT_TITLE;
      const baseDescription = activeFlow?.description || '';
      const baseVisibility = activeFlow?.visibility || 'private';
      const nextVersion = activeFlow?.source === 'cloud' ? activeFlow.version + 1 : 1;
      const payload = {
        title: baseTitle,
        description: baseDescription,
        owner: authUserId,
        flow_json: cloneFlow(currentFlow),
        thumbnail: activeFlow?.thumbnail || '',
        visibility: baseVisibility,
        version: nextVersion,
      };

      if (activeFlow?.source === 'cloud' && activeFlow.cloudId) {
        const remote = await pb.collection('puzzle_flows').getOne<CloudRecord>(activeFlow.cloudId);
        if (activeBaselineUpdatedAt && remote.updated && remote.updated !== activeBaselineUpdatedAt) {
          const shouldOverwrite = window.confirm('The cloud copy is newer than the version you loaded. Overwrite the cloud copy with the current canvas?');
          if (!shouldOverwrite) return;
        }
        const updated = await pb.collection('puzzle_flows').update<CloudRecord>(activeFlow.cloudId, payload);
        const saved = cloudRecordToSavedFlow(updated);
        setCloudFlows((flows) => flows.map((flow) => (flow.cloudId === saved.cloudId ? saved : flow)));
        setActiveFlowId(saved.id);
        setActiveBaselineUpdatedAt(saved.updatedAt);
        setStatus(`Saved “${saved.title}” to PocketBase at ${new Date(timestamp).toLocaleTimeString()}.`);
      } else {
        const created = await pb.collection('puzzle_flows').create<CloudRecord>(payload);
        const saved = cloudRecordToSavedFlow(created);
        setCloudFlows((flows) => [saved, ...flows]);
        setActiveFlowId(saved.id);
        setActiveBaselineUpdatedAt(saved.updatedAt);
        setStatus(`Created cloud flow “${saved.title}”.`);
      }
    } catch (cloudError) {
      console.error(cloudError);
      setError('Cloud save failed. Confirm you are signed in and the puzzle_flows schema/rules are configured.');
    } finally {
      setIsBusy(false);
    }
  }, [activeBaselineUpdatedAt, activeFlow, authUserId, currentFlow, isAuthenticated]);

  const handleLoad = useCallback((flow: SavedFlow) => {
    if (activeFlowId && JSON.stringify(currentFlow) !== JSON.stringify(activeFlow?.flow)) {
      const proceed = window.confirm('Load this saved flow? Unsaved canvas changes may be lost.');
      if (!proceed) return;
    }
    onLoadFlow(cloneFlow(flow.flow));
    setActiveFlowId(flow.id);
    setActiveBaselineUpdatedAt(flow.updatedAt);
    setStatus(`Loaded “${flow.title}” from ${flow.source === 'cloud' ? 'PocketBase' : 'local storage'}.`);
  }, [activeFlow, activeFlowId, currentFlow, onLoadFlow]);

  const handleLoadVenueRooms = useCallback(async () => {
    setIsVenueLoading(true);
    setError('');
    try {
      const rooms = await listGeneratedVenueRooms();
      setVenueRooms(rooms);
      setStatus(rooms.length
        ? `Found ${rooms.length} generated room${rooms.length === 1 ? '' : 's'} in your venue.`
        : 'No generated rooms in your venue yet. Use Create → Send to My Venue first.');
    } catch (venueError) {
      console.error(venueError);
      setError('Could not load your venue rooms. Confirm you are signed in with your ImmersiveKit account.');
    } finally {
      setIsVenueLoading(false);
    }
  }, []);

  const handleImportVenueRoom = useCallback((option: VenueRoomOption) => {
    const snapshot = buildFlowFromGeneratedRoom(option.room);
    const newFlow = makeLocalFlow(snapshot, option.title);
    upsertLocalFlow(newFlow);
    onLoadFlow(cloneFlow(snapshot));
    setActiveFlowId(newFlow.id);
    setActiveBaselineUpdatedAt(newFlow.updatedAt);
    setStatus(`Imported “${option.title}” from your venue. Saved as a local flow.`);
  }, [onLoadFlow, upsertLocalFlow]);

  const handleCreate = useCallback(() => {
    const title = window.prompt('New flow title:', DEFAULT_TITLE) || DEFAULT_TITLE;
    const newFlow = makeLocalFlow({ nodes: [], edges: [] }, title);
    upsertLocalFlow(newFlow);
    onLoadFlow(cloneFlow(newFlow.flow));
    setActiveFlowId(newFlow.id);
    setActiveBaselineUpdatedAt(newFlow.updatedAt);
    setStatus(`Created blank local flow “${newFlow.title}”.`);
  }, [onLoadFlow, upsertLocalFlow]);

  const handleRename = useCallback(async (flow: SavedFlow) => {
    const title = window.prompt('Rename flow:', flow.title)?.trim();
    if (!title) return;
    const description = window.prompt('Description:', flow.description || '') ?? flow.description;

    if (flow.source === 'cloud' && pb && flow.cloudId) {
      setIsBusy(true);
      try {
        const updated = await pb.collection('puzzle_flows').update<CloudRecord>(flow.cloudId, { title, description });
        const saved = cloudRecordToSavedFlow(updated);
        setCloudFlows((flows) => flows.map((item) => (item.cloudId === saved.cloudId ? saved : item)));
        setStatus(`Renamed cloud flow to “${saved.title}”.`);
      } catch (renameError) {
        console.error(renameError);
        setError('Cloud rename failed.');
      } finally {
        setIsBusy(false);
      }
      return;
    }

    const updated: SavedFlow = { ...flow, title, description, updatedAt: nowIso(), version: flow.version + 1 };
    upsertLocalFlow(updated);
    setStatus(`Renamed local flow to “${updated.title}”.`);
  }, [upsertLocalFlow]);

  const handleDuplicate = useCallback((flow: SavedFlow) => {
    const duplicate = makeLocalFlow(flow.flow, `${flow.title} Copy`);
    duplicate.description = flow.description;
    duplicate.visibility = flow.visibility;
    upsertLocalFlow(duplicate);
    setStatus(`Duplicated “${flow.title}” locally.`);
  }, [upsertLocalFlow]);

  const handleDelete = useCallback(async (flow: SavedFlow) => {
    const confirmed = window.confirm(`Delete “${flow.title}”? This cannot be undone.`);
    if (!confirmed) return;

    if (flow.source === 'cloud' && pb && flow.cloudId) {
      setIsBusy(true);
      try {
        await pb.collection('puzzle_flows').delete(flow.cloudId);
        setCloudFlows((flows) => flows.filter((item) => item.cloudId !== flow.cloudId));
        setStatus(`Deleted cloud flow “${flow.title}”.`);
      } catch (deleteError) {
        console.error(deleteError);
        setError('Cloud delete failed.');
      } finally {
        setIsBusy(false);
      }
    } else {
      setLocalFlows((flows) => flows.filter((item) => item.id !== flow.id));
      setStatus(`Deleted local flow “${flow.title}”.`);
    }

    if (activeFlowId === flow.id) {
      setActiveFlowId(null);
      setActiveBaselineUpdatedAt(null);
    }
  }, [activeFlowId]);

  const handleExportJson = useCallback((flow?: SavedFlow) => {
    const exportFlow = flow || activeFlow || makeLocalFlow(currentFlow, DEFAULT_TITLE);
    const payload = {
      schema: 'mjw-puzzle-flow-v1',
      exportedAt: nowIso(),
      flow: exportFlow,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${exportFlow.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'puzzle-flow'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(`Exported “${exportFlow.title}” as JSON.`);
  }, [activeFlow, currentFlow]);

  const handleImportJson = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const imported = parsed.flow?.flow ? parsed.flow : parsed.flow || parsed;
        const normalized = normalizeLocalFlow({
          ...imported,
          id: createId(),
          cloudId: undefined,
          source: 'local',
          title: imported.title ? `${imported.title} Import` : `${file.name.replace(/\.json$/i, '')} Import`,
          flow: imported.flow || imported,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
        if (!normalized) throw new Error('Invalid flow JSON.');
        upsertLocalFlow(normalized);
        setStatus(`Imported “${normalized.title}” into local storage.`);
      } catch (importError) {
        console.error(importError);
        setError('Import failed. Choose a valid MJW puzzle-flow JSON file or a raw { nodes, edges } flow file.');
      }
    };
    reader.readAsText(file);
  }, [upsertLocalFlow]);

  const handleLogin = useCallback(async () => {
    if (!pb) {
      setError('PocketBase is not configured. Add VITE_POCKETBASE_URL in Netlify to enable cloud mode.');
      return;
    }
    if (!email || !password) {
      setError('Enter your PocketBase email and password.');
      return;
    }

    setIsBusy(true);
    setError('');
    try {
      await pb.collection('users').authWithPassword(email, password);
      setPassword('');
      setAuthRevision((value) => value + 1);
      setStatus('Signed in. Cloud saves are now available.');
    } catch (loginError) {
      console.error(loginError);
      setError('Sign-in failed. Check your PocketBase account credentials.');
    } finally {
      setIsBusy(false);
    }
  }, [email, password]);

  const handleLogout = useCallback(() => {
    pb?.authStore.clear();
    setCloudFlows([]);
    setAuthRevision((value) => value + 1);
    setStatus('Signed out. Flows will be saved locally only.');
  }, []);

  const cloudStatusMessage = isPocketBaseConfigured
    ? isAuthenticated
      ? `Signed in to ${pocketBaseUrl}. Cloud saves are enabled.`
      : 'PocketBase is configured, but you are not signed in. Flows are saved locally only until you authenticate.'
    : 'PocketBase is not configured. The app is fully usable in anonymous local-only mode.';

  return (
    <aside className="w-80 flex-shrink-0 bg-slate-950 border-r border-slate-800 overflow-y-auto">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <FolderOpen size={16} className="text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-100">Saved Flows</h2>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Create local drafts, import/export JSON, and optionally sync authenticated flows to PocketBase.
        </p>
      </div>

      <div className="p-4 space-y-3 border-b border-slate-800">
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
          <div className="flex items-start gap-2">
            {isAuthenticated ? <Cloud size={15} className="text-sky-400 mt-0.5" /> : <HardDrive size={15} className="text-slate-400 mt-0.5" />}
            <p className="text-[11px] leading-relaxed text-slate-300">{cloudStatusMessage}</p>
          </div>
        </div>

        {isPocketBaseConfigured && !isAuthenticated && (
          <div className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="PocketBase email"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleLogin();
              }}
              placeholder="Password"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
            />
            <button
              onClick={() => void handleLogin()}
              disabled={isBusy}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-sky-500/50 bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={13} />}
              Sign In for Cloud Saves
            </button>
          </div>
        )}

        {isAuthenticated && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => void refreshCloudFlows()}
              disabled={isCloudLoading}
              className="flex items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-60"
            >
              {isCloudLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        )}
      </div>

      <div className="p-4 space-y-2 border-b border-slate-800">
        <button
          onClick={handleCreate}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-emerald-500/50 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
        >
          <Plus size={13} />
          New Blank Flow
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={saveCurrentLocal}
            className="flex items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            <Save size={13} />
            Save Local
          </button>
          <button
            onClick={() => void saveCurrentCloud()}
            disabled={!isAuthenticated || isBusy}
            className="flex items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Cloud size={13} />}
            Save Cloud
          </button>
          <button
            onClick={() => handleExportJson()}
            className="flex items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            <Download size={13} />
            Export JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            <Upload size={13} />
            Import JSON
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportJson} />
      </div>

      <div className="p-4 space-y-2 border-b border-slate-800">
        <button
          onClick={() => void handleLoadVenueRooms()}
          disabled={!isAuthenticated || isVenueLoading}
          title={isAuthenticated ? 'List rooms sent to your venue from Create' : 'Sign in to import rooms from your venue'}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-violet-500/50 bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isVenueLoading ? <Loader2 size={13} className="animate-spin" /> : <Building2 size={13} />}
          Import from My Venue
        </button>
        {venueRooms !== null && venueRooms.length > 0 && (
          <div className="space-y-1.5">
            {venueRooms.map((option) => (
              <button
                key={option.experienceId}
                onClick={() => handleImportVenueRoom(option)}
                className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-left text-xs text-slate-200 hover:border-violet-500/50 hover:bg-slate-800"
              >
                <span className="truncate">{option.title}</span>
                <span className="flex-shrink-0 text-[10px] text-slate-500">{option.room.puzzle_flow?.length ?? 0} puzzles</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {(status || error) && (
        <div className="p-4 border-b border-slate-800 space-y-2">
          {status && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2">
              <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-emerald-400" />
              <p className="text-[11px] leading-relaxed text-emerald-100">{status}</p>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-300" />
              <p className="text-[11px] leading-relaxed text-amber-100">{error}</p>
            </div>
          )}
        </div>
      )}

      <div className="p-4 space-y-4">
        <FlowList
          title="Cloud Flows"
          flows={cloudFlows}
          emptyText={isAuthenticated ? 'No cloud flows yet.' : 'Sign in to view cloud flows.'}
          activeFlowId={activeFlowId}
          onLoad={handleLoad}
          onRename={(flow) => void handleRename(flow)}
          onDuplicate={handleDuplicate}
          onDelete={(flow) => void handleDelete(flow)}
          onExport={handleExportJson}
        />
        <FlowList
          title="Local Flows"
          flows={localFlows}
          emptyText="No local flows yet. Save the current canvas or import JSON."
          activeFlowId={activeFlowId}
          onLoad={handleLoad}
          onRename={(flow) => void handleRename(flow)}
          onDuplicate={handleDuplicate}
          onDelete={(flow) => void handleDelete(flow)}
          onExport={handleExportJson}
        />
      </div>
    </aside>
  );
}

type FlowListProps = {
  title: string;
  flows: SavedFlow[];
  emptyText: string;
  activeFlowId: string | null;
  onLoad: (flow: SavedFlow) => void;
  onRename: (flow: SavedFlow) => void;
  onDuplicate: (flow: SavedFlow) => void;
  onDelete: (flow: SavedFlow) => void;
  onExport: (flow: SavedFlow) => void;
};

function FlowList({ title, flows, emptyText, activeFlowId, onLoad, onRename, onDuplicate, onDelete, onExport }: FlowListProps) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      {flows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-800 p-3 text-[11px] leading-relaxed text-slate-500">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {flows.map((flow) => (
            <article
              key={flow.id}
              className={`rounded-lg border p-3 ${activeFlowId === flow.id ? 'border-sky-500/60 bg-sky-500/10' : 'border-slate-800 bg-slate-900/60'}`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-100">{flow.title}</h4>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    v{flow.version} · {flow.visibility} · {new Date(flow.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                {flow.source === 'cloud' ? <Cloud size={13} className="text-sky-400" /> : <HardDrive size={13} className="text-slate-500" />}
              </div>
              {flow.description && <p className="mb-2 text-[11px] leading-relaxed text-slate-400">{flow.description}</p>}
              <div className="grid grid-cols-3 gap-1.5">
                <button onClick={() => onLoad(flow)} className="rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-[10px] font-medium text-slate-200 hover:bg-slate-700">Load</button>
                <button onClick={() => onRename(flow)} className="rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-[10px] font-medium text-slate-200 hover:bg-slate-700">Rename</button>
                <button onClick={() => onDuplicate(flow)} className="flex items-center justify-center gap-1 rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-[10px] font-medium text-slate-200 hover:bg-slate-700"><Copy size={10} />Copy</button>
                <button onClick={() => onExport(flow)} className="rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-[10px] font-medium text-slate-200 hover:bg-slate-700">Export</button>
                <button onClick={() => onDelete(flow)} className="col-span-2 flex items-center justify-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-1 text-[10px] font-medium text-rose-200 hover:bg-rose-500/20"><Trash2 size={10} />Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
