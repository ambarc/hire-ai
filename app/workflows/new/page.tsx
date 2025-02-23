import WorkflowForm from '../../components/WorkflowForm';

export default function NewWorkflowPage() {
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Workflow</h1>
            <WorkflowForm />
        </div>
    );
} 