import { Entity, PrimaryColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { TaskStatus } from '../../../../core/entities/task';
import { WorkflowEntity } from './workflow.entity';

@Entity('tasks')
export class TaskEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  type!: string;

  @Column()
  description!: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.NOT_STARTED
  })
  status!: TaskStatus;

  @Column('jsonb')
  input!: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  output?: Record<string, unknown>;

  @Column({ nullable: true })
  error?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => WorkflowEntity, workflow => workflow.tasks, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'workflow_id' })
  workflow!: WorkflowEntity;

  @Column('uuid')
  workflow_id!: string;
} 