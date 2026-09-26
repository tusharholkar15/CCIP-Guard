import { db } from '@bridgeguard/database';
import { responseProposals, auditLogs } from '@bridgeguard/database';
import { subscribeToChannel, publishEvent, CHANNELS } from '@bridgeguard/redis';
import { createWorker, QUEUE_NAMES, responsesQueue } from '@bridgeguard/redis';
import { eq } from 'drizzle-orm';

async function processApprovedResponses() {
  console.log('[Response Worker] Processing approved responses...');

  // Find all APPROVED proposals
  const approved = await db
    .select()
    .from(responseProposals)
    .where(eq(responseProposals.status, 'APPROVED'));

  for (const proposal of approved) {
    if (proposal.executionMode === 'LIVE') {
      // In a real implementation, this would execute on-chain actions.
      // For now, we mark it as EXECUTION_DISABLED since no executor is implemented.
      console.log(`[Response Worker] Proposal ${proposal.id}: LIVE execution not implemented. Marking as EXECUTION_DISABLED.`);
      
      await db
        .update(responseProposals)
        .set({
          status: 'EXECUTION_DISABLED',
          executionResult: { message: 'Live execution not yet implemented' },
          updatedAt: new Date(),
        })
        .where(eq(responseProposals.id, proposal.id));
    } else {
      // SIMULATION or DISABLED mode
      console.log(`[Response Worker] Proposal ${proposal.id}: Execution mode is ${proposal.executionMode}. No on-chain action taken.`);
      
      await db
        .update(responseProposals)
        .set({
          status: 'EXECUTION_DISABLED',
          executionResult: {
            mode: proposal.executionMode,
            message: `Response simulated. No on-chain execution performed.`,
            simulatedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(responseProposals.id, proposal.id));
    }

    // Audit log
    await db.insert(auditLogs).values({
      action: 'RESPONSE_EXECUTED',
      resource: 'response_proposal',
      resourceId: proposal.id,
      operatorId: 'system',
      operatorName: 'Response Worker',
      details: {
        executionMode: proposal.executionMode,
        type: proposal.type,
        target: proposal.target,
        result: 'EXECUTION_DISABLED - No on-chain action taken',
      },
      status: 'SUCCESS',
    });

    await publishEvent(CHANNELS.RESPONSE_UPDATED, {
      ...proposal,
      status: 'EXECUTION_DISABLED',
    });
  }

  console.log('[Response Worker] Processing complete.');
}

async function main() {
  console.log('[Response Worker] Starting...');
  console.log('[Response Worker] EXECUTION MODE: DISABLED/SIMULATION');
  console.log('[Response Worker] No on-chain actions will be executed.');

  // Schedule recurring check
  await responsesQueue.add(
    'process-responses',
    {},
    {
      repeat: { every: 30000 }, // Every 30 seconds
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  );

  const worker = createWorker(QUEUE_NAMES.RESPONSES, async () => {
    await processApprovedResponses();
  });

  worker.on('completed', (job) => {
    console.log(`[Response Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Response Worker] Job ${job?.id} failed:`, err);
  });

  // Also listen for response updates
  await subscribeToChannel(CHANNELS.RESPONSE_UPDATED, async () => {
    await processApprovedResponses();
  });

  console.log('[Response Worker] Running.');
}

main().catch((err) => {
  console.error('[Response Worker] Fatal error:', err);
  process.exit(1);
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
