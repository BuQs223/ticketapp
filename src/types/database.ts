// Database types based on the schema
export type FactoryRole = 'owner' | 'approver' | 'employee'
export type GymRole = 'owner' | 'employee'
export type EquipmentType = 'treadmill' | 'bike' | 'elliptical' | 'rower' | 'strength' | 'free_weights' | 'cable' | 'bench' | 'rack' | 'other'
export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'cardio' | 'full_body' | 'other'
export type EquipmentStatus = 'active' | 'retired' | 'maintenance'
export type TicketStatus = 'open' | 'in_review' | 'gym_fix_in_progress' | 'awaiting_factory_review' | 'factory_visit_requested' | 'factory_visit_approved' | 'resolved' | 'closed' | 'rejected'
export type Priority = 'low' | 'medium' | 'high'
export type EventType = 'status_change' | 'comment' | 'attachment' | 'approval_requested' | 'approval_granted' | 'approval_rejected'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type NotificationType = 'ticket_created' | 'ticket_updated' | 'visit_requested' | 'visit_approved' | 'visit_rejected' | 'gym_approved' | 'member_approved'

export interface Factory {
  id: string
  name: string
  owner_user_id: string
  created_at: string
}

export interface FactoryMember {
  user_id: string
  factory_id: string
  role: FactoryRole
  approved_at: string | null
  created_at: string
}

export interface Gym {
  id: string
  name: string
  factory_id: string
  owner_user_id: string
  status: 'pending_approval' | 'active' | 'suspended'
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

export interface GymMember {
  user_id: string
  gym_id: string
  role: GymRole
  approved_at: string | null
  created_at: string
}

export interface Equipment {
  id: string
  factory_id: string
  gym_id: string | null
  name: string
  serial_number: string
  qr_code: string
  equipment_type: EquipmentType
  muscle_group: MuscleGroup
  status: EquipmentStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  equipment_id: string
  gym_id: string
  factory_id: string
  status: TicketStatus
  priority: Priority
  created_by: string
  description: string
  photo_url: string | null
  created_at: string
  updated_at: string
  closed_at: string | null
  closed_by: string | null
  resolution_notes: string | null
}

export interface TicketEvent {
  id: string
  ticket_id: string
  actor_user_id: string
  event_type: EventType
  data: Record<string, any>
  created_at: string
}

export interface FactoryVisitRequest {
  ticket_id: string
  requested_by_gym_owner: boolean
  gym_owner_user_id: string | null
  gym_owner_requested_at: string | null
  requested_by_factory_employee: boolean
  factory_employee_user_id: string | null
  factory_employee_requested_at: string | null
  approval_status: ApprovalStatus
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  scheduled_visit_at: string | null
  technician_assigned_id: string | null
  visit_notes: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  payload: Record<string, any>
  read_at: string | null
  created_at: string
}
