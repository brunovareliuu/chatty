import { redirect } from 'next/navigation';
import { FlowBuilderScreen } from '@/components/flows/flow-builder-screen';
import { firebaseListo } from '@/lib/instalacion';

export default async function FlowBuilderPage({
  params,
}: {
  params: Promise<{ flowId: string }>;
}) {
  if (!firebaseListo()) redirect('/automations');
  const { flowId } = await params;
  return <FlowBuilderScreen flowId={flowId} />;
}
