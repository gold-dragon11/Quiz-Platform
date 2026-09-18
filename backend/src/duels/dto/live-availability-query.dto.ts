import { IsOptional, IsUUID } from 'class-validator';

export class LiveAvailabilityQueryDto {
  @IsUUID()
  subjectId!: string;

  @IsOptional()
  @IsUUID()
  topicId?: string;
}
