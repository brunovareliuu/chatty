import { redirect } from 'next/navigation';
import { AutomationEditor } from '@/components/automations/automation-editor';
import { firebaseListo } from '@/lib/instalacion';

export default async function AutomationPage({
  params,
}: {
  params: Promise<{ automationId: string }>;
}) {
  if (!firebaseListo()) redirect('/automations');
  const { automationId } = await params;
  return <AutomationEditor automationId={automationId} />;
}
