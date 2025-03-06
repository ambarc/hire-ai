import { Entity, PrimaryColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { WorkflowStatus } from '../../../../core/entities/workflow';
import { TaskEntity } from './task.entity';

@Entity('workflows')
export class WorkflowEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.NOT_STARTED
  })
  status!: WorkflowStatus;

  @OneToMany(() => TaskEntity, task => task.workflow, {
    cascade: true,
    eager: true
  })
  tasks!: TaskEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, unknown>;
} 