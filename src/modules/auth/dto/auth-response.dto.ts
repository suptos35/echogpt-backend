import { ApiProperty } from '@nestjs/swagger';

export class UserPayloadDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' })
  id: string;

  @ApiProperty({ example: 'user@echogpt.app' })
  email: string;

  @ApiProperty({ example: 'Demo' })
  firstName?: string;

  @ApiProperty({ example: 'User' })
  lastName?: string;

  @ApiProperty({ example: 'USER', enum: ['ADMIN', 'USER'] })
  role: string;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Short-lived JWT access token (15 minutes)',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Longer-lived JWT refresh token (7 days)',
  })
  refreshToken: string;

  @ApiProperty({ type: UserPayloadDto })
  user: UserPayloadDto;
}
