import Shell from '../components/Shell.jsx';
import { PageHeading } from '../components/shared.jsx';

export default function Syllabus() {
  return (
    <Shell>
      <PageHeading eyebrow="Structure" title="Syllabus" detail="Manage your course syllabi." />
      <div className="mt-6 rounded-2xl border border-card-border bg-card p-8 text-center text-muted-foreground">
        Syllabus management coming soon.
      </div>
    </Shell>
  );
}
