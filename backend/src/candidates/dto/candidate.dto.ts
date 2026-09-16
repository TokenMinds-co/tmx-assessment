import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsNormalizedEmail, IsPersonName } from '../../auth/dto/validators';
import type { Candidate } from '../../generated/prisma/client';

export class CandidateDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({ description: 'Links sent to this candidate.' })
  invitationCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  static from(
    candidate: Candidate & { _count?: { invitations: number } },
  ): CandidateDto {
    return {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      invitationCount: candidate._count?.invitations ?? 0,
      createdAt: candidate.createdAt,
    };
  }
}

export class CandidateListDto {
  @ApiProperty({ type: [CandidateDto] })
  items!: CandidateDto[];
}

export class CreateCandidateDto {
  @IsPersonName()
  name!: string;

  @IsNormalizedEmail()
  email!: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString()
  @MaxLength(40)
  phone?: string;
}

export class ListCandidatesQueryDto {
  @ApiPropertyOptional({
    description: 'Part of a name or email.',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
