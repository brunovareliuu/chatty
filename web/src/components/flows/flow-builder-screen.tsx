'use client';

import { Workflow } from 'lucide-react';
import { useAccounts } from '@/lib/client/accounts-context';
import { Empty } from '@/components/ui/empty';
import { FlowBuilder } from '@/components/flow/flow-builder';

export function FlowBuilderScreen({ flowId }: { flowId: string }) {
  const { account, loading } = useAccounts();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (!account) {
    return <Empty icon={Workflow} title="Conecta una cuenta para editar flujos" />;
  }

  return <FlowBuilder accountId={account.id} flowId={flowId} />;
}
