import { getWorkflowsContainer, Workflow, generateId } from '../utils/cosmosdb';

async function seedDefaultRequestWorkflow() {
    try {
        const container = getWorkflowsContainer();

        // Check if default request workflow already exists
        const { resources: existing } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.workflowType = @workflowType AND c.isDefault = true',
                parameters: [{ name: '@workflowType', value: 'request' }]
            })
            .fetchAll();

        if (existing.length > 0) {
            console.log('Default Request workflow already exists. Skipping seed.');
            return;
        }

        const now = new Date().toISOString();

        const defaultRequestWorkflow: Workflow = {
            id: 'default-request-workflow',
            workflowType: 'request',
            name: 'Default Request Workflow',
            description: 'Standard approval and fulfillment workflow for service requests',
            isDefault: true,
            isActive: true,
            version: '1.0.0',
            createdBy: 'system',
            createdDate: now,
            modifiedBy: 'system',
            modifiedDate: now,
            definition: {
                initialStatus: 'Pending Approval',
                stages: [
                    {
                        id: 'pending_approval',
                        name: 'Pending Approval',
                        type: 'initial',
                        color: '#FFA500',
                        icon: '⏳',
                        order: 1,
                        actions: [
                            {
                                id: 'notify_approver',
                                type: 'notification',
                                trigger: 'on_enter',
                                config: {
                                    recipient: 'approver',
                                    template: 'request_approval_needed'
                                }
                            }
                        ],
                        notifications: [
                            {
                                recipient: 'approver',
                                trigger: 'on_enter',
                                template: 'request_approval_needed'
                            }
                        ],
                        sla: {
                            duration: 24,
                            warningThreshold: 80
                        }
                    },
                    {
                        id: 'approved',
                        name: 'Approved',
                        type: 'intermediate',
                        color: '#22C55E',
                        icon: '✓',
                        order: 2,
                        actions: [],
                        notifications: [
                            {
                                recipient: 'requester',
                                trigger: 'on_enter',
                                template: 'request_approved'
                            }
                        ]
                    },
                    {
                        id: 'rejected',
                        name: 'Rejected',
                        type: 'final',
                        color: '#EF4444',
                        icon: '✗',
                        order: 3,
                        actions: [],
                        notifications: [
                            {
                                recipient: 'requester',
                                trigger: 'on_enter',
                                template: 'request_rejected'
                            }
                        ]
                    },
                    {
                        id: 'in_progress',
                        name: 'In Progress',
                        type: 'intermediate',
                        color: '#3B82F6',
                        icon: '🔧',
                        order: 4,
                        actions: [],
                        sla: {
                            duration: 72,
                            warningThreshold: 80
                        }
                    },
                    {
                        id: 'completed',
                        name: 'Completed',
                        type: 'final',
                        color: '#10B981',
                        icon: '✓',
                        order: 5,
                        actions: [],
                        notifications: [
                            {
                                recipient: 'requester',
                                trigger: 'on_enter',
                                template: 'request_completed'
                            }
                        ]
                    },
                    {
                        id: 'cancelled',
                        name: 'Cancelled',
                        type: 'final',
                        color: '#6B7280',
                        icon: '🚫',
                        order: 6,
                        actions: []
                    }
                ],
                transitions: [
                    {
                        id: 'approve',
                        fromStageId: 'pending_approval',
                        toStageId: 'approved',
                        label: 'Approve',
                        requiredRole: ['admin', 'agent'],
                        requiresComment: false
                    },
                    {
                        id: 'reject',
                        fromStageId: 'pending_approval',
                        toStageId: 'rejected',
                        label: 'Reject',
                        requiredRole: ['admin', 'agent'],
                        requiresComment: true
                    },
                    {
                        id: 'start_work',
                        fromStageId: 'approved',
                        toStageId: 'in_progress',
                        label: 'Start Work',
                        requiredRole: ['admin', 'agent']
                    },
                    {
                        id: 'complete',
                        fromStageId: 'in_progress',
                        toStageId: 'completed',
                        label: 'Complete',
                        requiredRole: ['admin', 'agent'],
                        requiresComment: false
                    },
                    {
                        id: 'cancel_from_pending',
                        fromStageId: 'pending_approval',
                        toStageId: 'cancelled',
                        label: 'Cancel',
                        requiredRole: ['admin', 'requester']
                    },
                    {
                        id: 'cancel_from_approved',
                        fromStageId: 'approved',
                        toStageId: 'cancelled',
                        label: 'Cancel',
                        requiredRole: ['admin', 'requester']
                    }
                ],
                rules: [
                    {
                        id: 'auto_approve_low_priority',
                        name: 'Auto-approve low priority requests',
                        description: 'Automatically approve requests with low priority',
                        conditions: [
                            {
                                field: 'Priority',
                                operator: 'equals',
                                value: 'Low'
                            }
                        ],
                        actions: [
                            {
                                id: 'auto_approve_action',
                                type: 'status_change',
                                trigger: 'on_enter',
                                config: {
                                    toStageId: 'approved',
                                    reason: 'Auto-approved due to low priority'
                                }
                            }
                        ],
                        priority: 1
                    }
                ]
            }
        };

        await container.items.create(defaultRequestWorkflow);
        console.log('Default Request workflow seeded successfully!');
        console.log('Workflow ID:', defaultRequestWorkflow.id);

    } catch (error) {
        console.error('Error seeding default Request workflow:', error);
        throw error;
    }
}

// Run the seed function
seedDefaultRequestWorkflow()
    .then(() => {
        console.log('Seed completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exit(1);
    });
