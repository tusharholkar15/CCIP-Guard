'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { SearchBar } from '@/components/ui/search-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { TechnicalValue } from '@/components/ui/technical-value';
import { Pagination } from '@/components/ui/pagination';
import { ErrorState } from '@/components/ui/error-state';
import { cn } from '@/lib/utils';

import { useMessages } from '@/hooks/useApi';
import {
  X,
  Hash,
  ArrowRightCircle,
  RefreshCw,
  Database,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { formatTimestamp, formatLatency } from '@bridgeguard/shared';

export default function MessagesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);

  const cleanSearch = search.trim();

  const { data, isLoading, error, refetch, isFetching } = useMessages({
    page,
    pageSize: 20,
    search: cleanSearch || undefined,
    sortBy,
    sortOrder,
  });


  // Guard against out-of-bounds page state when filtered data has fewer pages
  useEffect(() => {
    if (data?.totalPages && page > data.totalPages) {
      setPage(1);
    }
  }, [data?.totalPages, page]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSort = (key: string) => {
    setPage(1);
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  const columns = [
    {
      key: 'ccipMessageId',
      header: 'Message ID',
      sortable: true,
      className: 'whitespace-nowrap',
      render: (msg: any) => <TechnicalValue value={msg.ccipMessageId} copyable />,
    },
    {
      key: 'sourceChainName',
      header: 'Source',
      className: 'whitespace-nowrap',
      render: (msg: any) => (
        <span className="text-xs font-mono text-text-secondary">
          {msg.sourceChainName || `Chain ${msg.sourceChainId}`}
        </span>
      ),
    },
    {
      key: 'destinationChainName',
      header: 'Destination',
      className: 'whitespace-nowrap',
      render: (msg: any) => (
        <span className="text-xs font-mono text-text-secondary">
          {msg.destinationChainName || `Chain ${msg.destinationChainId}`}
        </span>
      ),
    },
    {
      key: 'state',
      header: 'State',
      sortable: true,
      className: 'whitespace-nowrap',
      render: (msg: any) => <StatusBadge status={msg.state} />,
    },
    {
      key: 'sourceTxHash',
      header: 'Source TX',
      className: 'whitespace-nowrap',
      render: (msg: any) => <TechnicalValue value={msg.sourceTxHash} copyable />,
    },
    {
      key: 'destinationTxHash',
      header: 'Destination TX',
      className: 'whitespace-nowrap',
      render: (msg: any) => <TechnicalValue value={msg.destinationTxHash} copyable />,
    },
    {
      key: 'sourceBlockNumber',
      header: 'Source Block',
      sortable: true,
      className: 'whitespace-nowrap',
      render: (msg: any) => (
        <span className="text-xs font-mono text-text-secondary">
          {msg.sourceBlockNumber ?? '--'}
        </span>
      ),
    },
    {
      key: 'destinationBlockNumber',
      header: 'Destination Block',
      sortable: true,
      className: 'whitespace-nowrap',
      render: (msg: any) => (
        <span className="text-xs font-mono text-text-secondary">
          {msg.destinationBlockNumber ?? '--'}
        </span>
      ),
    },
    {
      key: 'latencyMs',
      header: 'Latency',
      sortable: true,
      className: 'whitespace-nowrap',
      render: (msg: any) => (
        <span className="text-xs font-mono text-text-secondary">
          {formatLatency(msg.latencyMs)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      className: 'whitespace-nowrap',
      render: (msg: any) => (
        <span className="text-xs font-mono text-text-muted">
          {formatTimestamp(msg.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout title="Messages">
      <PageHeader
        title="Messages Console"
        description="Live CCIP telemetry log and lifecycle tracking."
      >
        <div className="flex items-center gap-4">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="Search Hash, Message ID..."
            className="w-96"
          />
          <button
            onClick={() => refetch()}
            className="p-2 rounded-sm border border-border/40 bg-surface-primary hover:bg-surface-primary/80 text-text-muted hover:text-text-primary transition-colors focus:outline-none"
            title="Refresh messages"
            aria-label="Refresh messages"
          >
            <RefreshCw className={cn('h-5 w-5', (isLoading || isFetching) && 'animate-spin')} />
          </button>
        </div>
      </PageHeader>

      {error ? (
        <ErrorState
          message="Unable to load messages."
          details={JSON.stringify(error)}
          onRetry={() => refetch()}
        />
      ) : (
        <div className="flex gap-8 items-start">
          <div
            className={`flex-1 rounded-sm border border-border/40 bg-surface-primary overflow-hidden transition-all duration-300 min-w-0 ${
              selectedMessage ? 'hidden xl:block' : ''
            }`}
          >
            <DataTable
              columns={columns}
              data={data?.data || []}
              loading={isLoading}
              emptyTitle="No messages indexed"
              emptyDescription={
                cleanSearch
                  ? `No messages match "${cleanSearch}". Try clearing search or entering a valid ID/Tx.`
                  : 'Awaiting cross-chain telemetry.'
              }
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              onRowClick={setSelectedMessage}
            />
            {data && data.totalPages > 0 && (
              <div className="p-6 border-t border-border/40 bg-surface-primary">
                <Pagination
                  page={data.page}
                  totalPages={data.totalPages}
                  totalItems={data.total}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>

          {/* Details Drawer */}
          {selectedMessage && (
            <div className="w-full xl:w-[540px] shrink-0 flex flex-col rounded-sm border border-border/40 bg-surface-primary overflow-hidden animate-fade-in relative max-h-[calc(100vh-140px)] sticky top-6">
              <div className="p-6 border-b border-border/40 bg-surface-primary flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <Hash className="h-5 w-5 text-status-info" />
                  <h3 className="text-sm font-mono font-bold text-text-primary uppercase tracking-widest">Transaction Detail</h3>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-1 rounded-sm hover:bg-surface-primary/80 text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                  aria-label="Close details drawer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                {/* Message ID */}
                <div>
                  <div className="text-xs text-text-muted font-mono uppercase tracking-widest mb-2 font-bold">
                    Message ID
                  </div>
                  <div className="p-4 bg-surface-primary rounded-sm border border-border/40 font-mono text-sm text-text-primary break-all flex items-center justify-between gap-3">
                    <TechnicalValue
                      value={selectedMessage.ccipMessageId}
                      truncate={false}
                      copyable
                      className="w-full justify-between"
                    />
                  </div>
                </div>

                {/* State & Latency */}
                <div className="flex items-center justify-between p-4 bg-surface-primary rounded-sm border border-border/40">
                  <div>
                    <div className="text-xs text-text-muted font-mono uppercase tracking-widest mb-2 font-bold">
                      State
                    </div>
                    <StatusBadge status={selectedMessage.state} size="md" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-text-muted font-mono uppercase tracking-widest mb-2 font-bold">
                      Latency
                    </div>
                    <span className="font-mono text-base text-status-info font-bold">
                      {formatLatency(selectedMessage.latencyMs)}
                    </span>
                  </div>
                </div>

                {/* Source & Destination Route */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-primary rounded-sm border border-border/40">
                    <div className="text-xs text-text-muted font-mono uppercase tracking-widest mb-2 font-bold">
                      Source
                    </div>
                    <div className="text-sm font-mono font-bold text-text-primary truncate">
                      {selectedMessage.sourceChainName || `Chain ${selectedMessage.sourceChainId}`}
                    </div>
                    <div className="text-xs text-text-muted mt-1 font-mono">
                      Chain ID: {selectedMessage.sourceChainId}
                    </div>
                  </div>
                  <div className="p-4 bg-surface-primary rounded-sm border border-border/40">
                    <div className="text-xs text-text-muted font-mono uppercase tracking-widest mb-2 font-bold">
                      Destination
                    </div>
                    <div className="text-sm font-mono font-bold text-text-primary truncate">
                      {selectedMessage.destinationChainName ||
                        `Chain ${selectedMessage.destinationChainId}`}
                    </div>
                    <div className="text-xs text-text-muted mt-1 font-mono">
                      Chain ID: {selectedMessage.destinationChainId}
                    </div>
                  </div>
                </div>

                {/* Lifecycle Section */}
                <div>
                  <div className="text-xs text-text-muted font-mono uppercase tracking-widest mb-6 font-bold">
                    Lifecycle
                  </div>

                  <div className="relative pl-8 border-l border-border/40 space-y-8 pb-4">
                    {/* Stage 1: SOURCE EMISSION */}
                    <div className="relative">
                      <div className="absolute w-3 h-3 bg-status-healthy rounded-full -left-[38px] top-1 border border-bg-primary" />
                      <h4 className="text-xs font-mono font-bold text-text-primary uppercase tracking-widest mb-4 flex items-center gap-3">
                        <ArrowRightCircle className="h-5 w-5 text-status-healthy" />
                        Source Emission
                      </h4>
                      <div className="space-y-4 p-4 bg-surface-primary border border-border/40 rounded-sm text-xs font-mono">
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Source TX</span>
                          <TechnicalValue value={selectedMessage.sourceTxHash || '--'} copyable />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Source Block</span>
                          <span className="font-mono text-text-secondary">
                            {selectedMessage.sourceBlockNumber ?? '--'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Source Timestamp</span>
                          <span className="font-mono text-text-secondary">
                            {formatTimestamp(selectedMessage.sourceTimestamp)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Sender</span>
                          <TechnicalValue value={selectedMessage.sender} copyable />
                        </div>
                      </div>
                    </div>

                    {/* Stage 2: INDEXED */}
                    <div className="relative">
                      <div className="absolute w-3 h-3 bg-status-healthy rounded-full -left-[38px] top-1 border border-bg-primary" />
                      <h4 className="text-xs font-mono font-bold text-text-primary uppercase tracking-widest mb-4 flex items-center gap-3">
                        <Database className="h-5 w-5 text-status-healthy" />
                        Indexed
                      </h4>
                      <div className="space-y-4 p-4 bg-surface-primary border border-border/40 rounded-sm text-xs font-mono">
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Indexed Timestamp</span>
                          <span className="font-mono text-text-secondary">
                            {formatTimestamp(selectedMessage.createdAt)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">CCIP Lane</span>
                          <TechnicalValue
                            value={selectedMessage.laneId}
                            copyable
                            chars={4}
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Ingestion Status</span>
                          <span className="text-status-healthy font-bold flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" /> Indexed
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stage 3: DESTINATION EXECUTION */}
                    <div className="relative">
                      <div
                        className={`absolute w-3 h-3 rounded-full -left-[38px] top-1 border border-bg-primary ${
                          selectedMessage.destinationTxHash
                            ? 'bg-status-healthy'
                            : 'bg-status-warning animate-pulse'
                        }`}
                      />
                      <h4 className="text-xs font-mono font-bold text-text-primary uppercase tracking-widest mb-4 flex items-center gap-3">
                        <ArrowRightCircle
                          className={
                            selectedMessage.destinationTxHash
                              ? 'h-5 w-5 text-status-healthy'
                              : 'h-5 w-5 text-status-warning'
                          }
                        />
                        Destination Execution
                      </h4>
                      <div className="space-y-4 p-4 bg-surface-primary border border-border/40 rounded-sm text-xs font-mono">
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Destination TX</span>
                          {selectedMessage.destinationTxHash ? (
                            <TechnicalValue
                              value={selectedMessage.destinationTxHash}
                              copyable
                            />
                          ) : (
                            <span className="text-status-warning font-bold italic">
                              Pending...
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Destination Block</span>
                          <span className="font-mono text-text-secondary">
                            {selectedMessage.destinationBlockNumber ?? '--'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Destination Timestamp</span>
                          <span className="font-mono text-text-secondary">
                            {formatTimestamp(selectedMessage.destinationTimestamp)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Receiver</span>
                          <TechnicalValue value={selectedMessage.receiver} copyable />
                        </div>
                      </div>
                    </div>

                    {/* Stage 4: DELIVERED */}
                    <div className="relative">
                      <div
                        className={`absolute w-3 h-3 rounded-full -left-[38px] top-1 border border-bg-primary ${
                          selectedMessage.state === 'DELIVERED'
                            ? 'bg-status-healthy'
                            : selectedMessage.state === 'FAILED'
                            ? 'bg-status-critical'
                            : 'bg-status-warning'
                        }`}
                      />
                      <h4 className="text-xs font-mono font-bold text-text-primary uppercase tracking-widest mb-4 flex items-center gap-3">
                        <CheckCircle2
                          className={
                            selectedMessage.state === 'DELIVERED'
                              ? 'h-5 w-5 text-status-healthy'
                              : 'h-5 w-5 text-status-warning'
                          }
                        />
                        Delivered
                      </h4>
                      <div className="space-y-4 p-4 bg-surface-primary border border-border/40 rounded-sm text-xs font-mono">
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Final State</span>
                          <StatusBadge status={selectedMessage.state} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Total Latency</span>
                          <span className="font-mono text-status-info font-bold">
                            {formatLatency(selectedMessage.latencyMs)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Delivered At</span>
                          <span className="font-mono text-text-secondary">
                            {formatTimestamp(
                              selectedMessage.destinationTimestamp || selectedMessage.updatedAt,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
