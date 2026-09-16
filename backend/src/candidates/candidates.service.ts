import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Candidate, Prisma } from '../generated/prisma/client';
import { isUniqueViolation } from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { CandidateDto } from './dto/candidate.dto';

const CANDIDATE_NOT_FOUND = 'That candidate doesn’t exist.';

export interface CandidateInput {
  name: string;
  email: string;
  phone?: string;
}

/**
 * People sent assessments. Staff enter a candidate once; later tests reuse
 * the record. The recruitment pipeline will add to it. See docs/assessments.md.
 */
@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Most recently active first. */
  async search(
    search: string | undefined,
    limit: number,
  ): Promise<CandidateDto[]> {
    const where: Prisma.CandidateWhereInput | undefined = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined;
    const candidates = await this.prisma.candidate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { _count: { select: { invitations: true } } },
    });
    return candidates.map((candidate) => CandidateDto.from(candidate));
  }

  async get(id: string): Promise<Candidate> {
    const candidate = await this.prisma.candidate.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException(CANDIDATE_NOT_FOUND);
    return candidate;
  }

  async create(input: CandidateInput): Promise<Candidate> {
    try {
      return await this.prisma.candidate.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'A candidate with this email already exists.',
        );
      }
      throw error;
    }
  }

  /** The candidate with this email, created if new. A different name replaces the old one. */
  upsert(input: CandidateInput): Promise<Candidate> {
    return this.prisma.candidate.upsert({
      where: { email: input.email },
      create: { name: input.name, email: input.email },
      update: { name: input.name },
    });
  }
}
