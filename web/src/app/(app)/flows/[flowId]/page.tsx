import { FlowBuilderScreen } from '@/components/flows/flow-builder-screen';

export default async function FlowBuilderPage({
  params,
}: {
  params: Promise<{ flowId: string }>;
}) {
  const { flowId } = await params;
  return <FlowBuilderScreen flowId={flowId} />;
}
