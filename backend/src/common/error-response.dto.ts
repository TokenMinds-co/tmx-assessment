import { ApiProperty } from '@nestjs/swagger';

/** The error body every endpoint returns: NestJS's default shape. For the API docs. */
export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    description:
      'A message to show people, or a list of them for validation errors.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Invalid email or password.',
  })
  message!: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error!: string;
}
