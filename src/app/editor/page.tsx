import { PlateEditor } from '@/components/editor/plate-editor';

export default function Page() {
  return (
    <div className="w-full h-screen" data-registry="plate">
      <PlateEditor />
    </div>
  );
}
