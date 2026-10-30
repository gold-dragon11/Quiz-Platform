import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

/**
 * The first screen's answer: the subjects the learner takes, the first of them
 * being where the short diagnostic test starts. Empty means «skip».
 */
export class UpdateStudyDto {
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('all', { each: true })
  subjectIds!: string[];
}
