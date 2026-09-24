import { AutomationEditor } from '@/components/automations/automation-editor';

export default async function AutomationPage({
  params,
}: {
  params: Promise<{ automationId: string }>;
}) {
  const { automationId } = await params;
  return <AutomationEditor automationId={automationId} />;
}
